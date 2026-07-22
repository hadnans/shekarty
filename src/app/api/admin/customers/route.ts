// GGH Admin — Customers List
// GET: Paginated customer list with search, wholesaleStatus filter

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { paginatedResponse } from '@/lib/ggh/auth';
import { adminCustomerListSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-customers');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = adminCustomerListSchema.parse(queryParams);
  const { page, limit, search, status, wholesaleStatus, sortBy, sortOrder } = validated;

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  if (wholesaleStatus !== 'all') {
    where.wholesaleStatus = wholesaleStatus;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { nameAr: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;

  // Determine ordering
  const orderDirection = sortOrder;
  const orderBy: Record<string, string> = {};
  if (sortBy === 'createdAt') orderBy.createdAt = orderDirection;
  else if (sortBy === 'name') orderBy.firstName = orderDirection;
  else orderBy.createdAt = orderDirection;

  // For totalSpent and orderCount sorting, we need a different approach
  // since those are computed from related orders
  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        nameAr: true,
        preferredLang: true,
        wholesaleStatus: true,
        isVerified: true,
        isActive: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { orders: true },
        },
      },
    }),
    db.customer.count({ where }),
  ]);

  // Get order totals for each customer
  const customerIds = customers.map((c) => c.id);
  const orderStats = await db.order.groupBy({
    by: ['customerId'],
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      customerId: { in: customerIds },
      deletedAt: null,
    },
  });

  const statsMap = new Map(
    orderStats.map((s) => [
      s.customerId,
      { totalSpent: s._sum.totalAmount || 0, orderCount: s._count.id },
    ])
  );

  // Enrich with stats
  const enrichedCustomers = customers.map((c) => ({
    id: c.id,
    phone: c.phone,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    nameAr: c.nameAr,
    preferredLang: c.preferredLang,
    wholesaleStatus: c.wholesaleStatus,
    isVerified: c.isVerified,
    isActive: c.isActive,
    avatarUrl: c.avatarUrl,
    lastLoginAt: c.lastLoginAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    orderCount: statsMap.get(c.id)?.orderCount || c._count.orders,
    totalSpent: statsMap.get(c.id)?.totalSpent || 0,
    displayName: `${c.firstName} ${c.lastName}`.trim() || c.phone,
  }));

  logger.info('Admin customers list', {
    adminId: admin.id,
    page,
    limit,
    total,
    filters: { status, wholesaleStatus, search },
  });

  return paginatedResponse(enrichedCustomers, page, limit, total);
});

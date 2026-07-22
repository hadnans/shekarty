// GGH Admin — Orders List
// GET: Paginated order list (all customers, with search, status, date range filters)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { paginatedResponse } from '@/lib/ggh/auth';
import { adminOrderListSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-orders');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = adminOrderListSchema.parse(queryParams);
  const { page, limit, search, status, paymentStatus, dateFrom, dateTo, sortBy, sortOrder } = validated;

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (status !== 'all') {
    where.status = status;
  }

  if (paymentStatus !== 'all') {
    where.paymentStatus = paymentStatus;
  }

  if (dateFrom) {
    where.createdAt = { gte: new Date(dateFrom) };
  }
  if (dateTo) {
    const createdAtFilter = where.createdAt as Record<string, unknown> || {};
    createdAtFilter.lte = new Date(dateTo);
    where.createdAt = createdAtFilter;
  }

  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { notes: { contains: search } },
      { customer: { firstName: { contains: search } } },
      { customer: { lastName: { contains: search } } },
      { customer: { phone: { contains: search } } },
      { customer: { email: { contains: search } } },
    ];
  }

  // Sort mapping
  const orderDirection = sortOrder;
  const orderBy: Record<string, string> = {};
  if (sortBy === 'createdAt') orderBy.createdAt = orderDirection;
  else if (sortBy === 'totalAmount') orderBy.totalAmount = orderDirection;
  else if (sortBy === 'status') orderBy.status = orderDirection;
  else orderBy.createdAt = orderDirection;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        subtotal: true,
        deliveryFee: true,
        discountAmount: true,
        totalAmount: true,
        notes: true,
        deliveryDate: true,
        deliveredAt: true,
        driverName: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            wholesaleStatus: true,
          },
        },
        items: {
          select: {
            id: true,
            productNameEn: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    db.order.count({ where }),
  ]);

  // Enrich orders with computed fields
  const enrichedOrders = orders.map((order) => ({
    ...order,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim() || order.customer.phone,
    itemCount: order._count.items,
    items: order.items,
    _count: undefined,
  }));

  logger.info('Admin orders list', {
    adminId: admin.id,
    page,
    limit,
    total,
    filters: { status, paymentStatus, search },
  });

  return paginatedResponse(enrichedOrders, page, limit, total);
});

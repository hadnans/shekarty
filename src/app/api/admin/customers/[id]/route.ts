// GGH Admin — Customer Detail
// GET, PATCH: View/update customer (wholesaleStatus, isActive)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('admin-customer-detail');

// Schema for customer update
const adminCustomerUpdateSchema = z.object({
  wholesaleStatus: z.enum(['retail', 'wholesale', 'vip']).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  preferredLang: z.enum(['ar', 'en']).optional(),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Extract customer ID from URL path
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const customerId = segments[segments.length - 2];

  if (!customerId) {
    throw new NotFoundError('Customer ID required');
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
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
        select: {
          orders: true,
          addresses: true,
          wishlists: true,
          reviews: true,
        },
      },
    },
  });

  if (!customer || customer.deletedAt) {
    throw new NotFoundError('Customer not found');
  }

  // Get order stats
  const orderStats = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      customerId,
      deletedAt: null,
    },
  });

  // Get recent orders
  const recentOrders = await db.order.findMany({
    where: { customerId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      createdAt: true,
    },
  });

  const enrichedCustomer = {
    ...customer,
    displayName: `${customer.firstName} ${customer.lastName}`.trim() || customer.phone,
    totalSpent: orderStats._sum.totalAmount || 0,
    orderCount: orderStats._count.id,
    recentOrders,
  };

  logger.info('Admin customer detail', {
    adminId: admin.id,
    customerId,
  });

  return successResponse(enrichedCustomer);
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Extract customer ID from URL path
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const customerId = segments[segments.length - 2];

  if (!customerId) {
    throw new NotFoundError('Customer ID required');
  }

  const existingCustomer = await db.customer.findUnique({
    where: { id: customerId },
  });

  if (!existingCustomer || existingCustomer.deletedAt) {
    throw new NotFoundError('Customer not found');
  }

  const body = await request.json();
  const validated = adminCustomerUpdateSchema.parse(body);

  const updatedCustomer = await db.customer.update({
    where: { id: customerId },
    data: validated,
  });

  logger.info('Admin customer updated', {
    adminId: admin.id,
    customerId,
    changes: validated,
  });

  return successResponse(updatedCustomer, 'Customer updated successfully');
});

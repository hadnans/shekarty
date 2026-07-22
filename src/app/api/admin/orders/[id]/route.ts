// GGH Admin — Order Detail
// GET: Single order with items, customer info, status history
// PATCH: Update order status, assign driver, add notes

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('admin-order-detail');

// Schema for order update
const adminOrderUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ]).optional(),
  notes: z.string().optional(),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Extract order ID from URL path
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const orderId = segments[segments.length - 2];

  if (!orderId) {
    throw new NotFoundError('Order ID required');
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          nameAr: true,
          wholesaleStatus: true,
          isVerified: true,
        },
      },
      items: {
        select: {
          id: true,
          productId: true,
          productNameEn: true,
          productNameAr: true,
          brandEn: true,
          brandAr: true,
          weight: true,
          icon: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          note: true,
          changedBy: true,
          createdAt: true,
        },
      },
      assignment: {
        select: {
          id: true,
          driverId: true,
          status: true,
          assignedAt: true,
          acceptedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          driver: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
              phone: true,
            },
          },
        },
      },
      paymentTransactions: {
        select: {
          id: true,
          provider: true,
          amount: true,
          status: true,
          method: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order || order.deletedAt) {
    throw new NotFoundError('Order not found');
  }

  logger.info('Admin order detail', {
    adminId: admin.id,
    orderId,
  });

  return successResponse(order);
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Extract order ID from URL path
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const orderId = segments[segments.length - 2];

  if (!orderId) {
    throw new NotFoundError('Order ID required');
  }

  const existingOrder = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder || existingOrder.deletedAt) {
    throw new NotFoundError('Order not found');
  }

  const body = await request.json();
  const validated = adminOrderUpdateSchema.parse(body);

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (validated.status !== undefined) updateData.status = validated.status;
  if (validated.notes !== undefined) updateData.notes = validated.notes;
  if (validated.driverId !== undefined) updateData.driverId = validated.driverId;
  if (validated.driverName !== undefined) updateData.driverName = validated.driverName;
  if (validated.driverPhone !== undefined) updateData.driverPhone = validated.driverPhone;
  if (validated.paymentStatus !== undefined) updateData.paymentStatus = validated.paymentStatus;

  // If status changed to delivered, set deliveredAt timestamp
  if (validated.status === 'delivered') {
    updateData.deliveredAt = new Date();
  }

  // Update order
  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: updateData,
  });

  // If status changed, create a status history entry
  if (validated.status !== undefined && validated.status !== existingOrder.status) {
    await db.orderStatusHistory.create({
      data: {
        orderId,
        status: validated.status,
        note: validated.notes || `Status changed from ${existingOrder.status} to ${validated.status}`,
        changedBy: `admin:${admin.id}`,
      },
    });
  }

  // If driver was assigned, create or update delivery assignment
  if (validated.driverId !== undefined) {
    const existingAssignment = await db.deliveryAssignment.findUnique({
      where: { orderId },
    });

    if (existingAssignment) {
      await db.deliveryAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          driverId: validated.driverId,
          status: 'assigned',
          assignedAt: new Date(),
        },
      });
    } else {
      await db.deliveryAssignment.create({
        data: {
          orderId,
          driverId: validated.driverId,
          status: 'assigned',
          assignedAt: new Date(),
        },
      });
    }
  }

  logger.info('Admin order updated', {
    adminId: admin.id,
    orderId,
    changes: validated,
  });

  return successResponse(updatedOrder, 'Order updated successfully');
});

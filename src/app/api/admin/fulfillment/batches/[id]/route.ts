// GGH Admin Fulfillment Batch Detail — GET, PATCH (update status)
// Uses apiHandler, requireAdminAuthOrThrow

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { BATCH_STATUS_TRANSITIONS, type BatchStatus } from '@/lib/fulfillment/config';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-fulfillment-batch-detail');

// ============================================
// VALIDATION
// ============================================

const batchUpdateSchema = z.object({
  status: z.enum([
    'pending', 'picking', 'picked', 'packing', 'packed', 'shipped', 'delivered', 'cancelled',
  ]).optional(),
});

// ============================================
// GET — Single batch with full details
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const batch = await db.fulfillmentBatch.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, nameEn: true, nameAr: true } },
      items: {
        include: {
          product: { select: { id: true, nameEn: true, nameAr: true, icon: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      },
    },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  logger.info('Fulfillment batch detail fetched', { adminId: admin.id, batchId: id });

  return successResponse({
    id: batch.id,
    warehouseId: batch.warehouseId,
    warehouseName: batch.warehouse.nameEn,
    status: batch.status,
    totalOrders: batch.totalOrders,
    totalItems: batch.totalItems,
    assignedAt: batch.assignedAt?.toISOString() ?? null,
    pickedAt: batch.pickedAt?.toISOString() ?? null,
    packedAt: batch.packedAt?.toISOString() ?? null,
    shippedAt: batch.shippedAt?.toISOString() ?? null,
    items: batch.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      orderNumber: item.order.orderNumber,
      productId: item.productId,
      productName: item.product.nameEn,
      quantity: item.quantity,
      pickedQuantity: item.pickedQuantity,
      status: item.status,
    })),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }, 'Batch retrieved');
});

// ============================================
// PATCH — Update batch status with transition validation
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const existing = await db.fulfillmentBatch.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  const body = await request.json();
  const parsed = batchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid batch update data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  if (data.status) {
    // Validate status transition
    const allowedNext = BATCH_STATUS_TRANSITIONS[existing.status as BatchStatus];
    if (!allowedNext || !allowedNext.includes(data.status)) {
      throw new ForbiddenError(
        `Cannot transition batch from '${existing.status}' to '${data.status}'`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Set appropriate timestamps
    const updateData: Record<string, unknown> = { status: data.status };
    if (data.status === 'picking') updateData.assignedAt = new Date();
    if (data.status === 'picked') updateData.pickedAt = new Date();
    if (data.status === 'packing') updateData.packedAt = null; // packing in progress
    if (data.status === 'packed') updateData.packedAt = new Date();
    if (data.status === 'shipped') updateData.shippedAt = new Date();

    await db.fulfillmentBatch.update({
      where: { id },
      data: updateData,
    });
  }

  const updated = await db.fulfillmentBatch.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, nameEn: true } },
    },
  });

  logger.info('Batch status updated', {
    adminId: admin.id,
    batchId: id,
    from: existing.status,
    to: data.status,
  });

  return successResponse({
    id: updated!.id,
    status: updated!.status,
    updatedAt: updated!.updatedAt.toISOString(),
  }, 'Batch updated');
});

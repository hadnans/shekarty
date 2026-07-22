// GGH Admin Fulfillment Batches — GET list, POST create batch
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse, paginatedResponse } from '@/lib/ggh/auth';
import { MAX_BATCH_SIZE } from '@/lib/fulfillment/config';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-fulfillment-batches');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const batchCreateSchema = z.object({
  warehouseId: z.string().min(1),
  orderIds: z.array(z.string().min(1)).min(1).max(MAX_BATCH_SIZE),
});

const batchListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  warehouseId: z.string().optional(),
});

// ============================================
// GET — List fulfillment batches with filters
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const parsed = batchListSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const { page, limit, status, warehouseId } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (warehouseId) where.warehouseId = warehouseId;

  const [batches, total] = await Promise.all([
    db.fulfillmentBatch.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        warehouse: { select: { id: true, nameEn: true, nameAr: true } },
        items: { select: { id: true } },
      },
    }),
    db.fulfillmentBatch.count({ where }),
  ]);

  const batchesList = batches.map((batch) => ({
    id: batch.id,
    warehouseId: batch.warehouseId,
    warehouseName: batch.warehouse.nameEn,
    status: batch.status,
    totalOrders: batch.totalOrders,
    totalItems: batch.totalItems,
    itemsCount: batch.items.length,
    assignedAt: batch.assignedAt?.toISOString() ?? null,
    pickedAt: batch.pickedAt?.toISOString() ?? null,
    packedAt: batch.packedAt?.toISOString() ?? null,
    shippedAt: batch.shippedAt?.toISOString() ?? null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }));

  logger.info('Fulfillment batches listed', { adminId: admin.id, total });

  return paginatedResponse(batchesList, page, limit, total);
});

// ============================================
// POST — Create a new fulfillment batch
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = batchCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid batch data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const { warehouseId, orderIds } = parsed.data;

  // Verify warehouse exists
  const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) {
    throw new ValidationError('Warehouse not found', 'WAREHOUSE_NOT_FOUND');
  }

  // Verify all orders exist and are in valid status for batching
  const orders = await db.order.findMany({
    where: { id: { in: orderIds } },
    include: { items: true },
  });

  if (orders.length !== orderIds.length) {
    throw new ValidationError('Some order IDs do not exist', 'INVALID_ORDER_IDS');
  }

  // Validate order statuses — only confirmed/processing orders can be batched
  const invalidOrders = orders.filter((o) => !['confirmed', 'processing'].includes(o.status));
  if (invalidOrders.length > 0) {
    throw new ValidationError(
      `${invalidOrders.length} orders are not in a valid status for batching`,
      'INVALID_ORDER_STATUS',
      { invalidOrderIds: invalidOrders.map((o) => o.id) }
    );
  }

  // Calculate totals
  const totalOrders = orders.length;
  const totalItems = orders.reduce(
    (sum, order) => sum + order.items.length,
    0
  );

  // Create batch with items
  const batch = await db.fulfillmentBatch.create({
    data: {
      warehouseId,
      totalOrders,
      totalItems,
      status: 'pending',
      items: {
        create: orders.flatMap((order) =>
          order.items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            status: 'pending',
          }))
        ),
      },
    },
    include: {
      warehouse: { select: { id: true, nameEn: true, nameAr: true } },
      items: true,
    },
  });

  logger.info('Fulfillment batch created', {
    adminId: admin.id,
    batchId: batch.id,
    totalOrders,
    totalItems,
    warehouseId,
  });

  return successResponse({
    id: batch.id,
    warehouseId: batch.warehouseId,
    warehouseName: batch.warehouse.nameEn,
    status: batch.status,
    totalOrders: batch.totalOrders,
    totalItems: batch.totalItems,
    items: batch.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      quantity: item.quantity,
      pickedQuantity: item.pickedQuantity,
      status: item.status,
    })),
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  }, 'Fulfillment batch created', 201);
});

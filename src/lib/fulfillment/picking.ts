// GGH Fulfillment — Picking operations
// Pick list generation, batch picking start/complete operations

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { BATCH_STATUS_TRANSITIONS, ITEM_STATUS_TRANSITIONS } from './config';
import { type BatchStatus, type BatchItemStatus, type PickList, type PickListGroup } from './types';
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';

const logger = createLogger('fulfillment-picking');

// ============================================
// PICK LIST GENERATION
// ============================================

/**
 * Generate a pick list for a fulfillment batch.
 * Groups items by product for efficient warehouse picking.
 */
export async function generatePickList(batchId: string): Promise<PickList> {
  const batch = await db.fulfillmentBatch.findUnique({
    where: { id: batchId },
    include: {
      warehouse: { select: { id: true, nameEn: true, nameAr: true } },
      items: {
        include: {
          product: { select: { id: true, nameEn: true, nameAr: true, icon: true } },
        },
      },
    },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  // Group items by product
  const productGroups = new Map<string, PickListGroup>();

  for (const item of batch.items) {
    const existing = productGroups.get(item.productId);
    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.orderIds.push(item.orderId);
    } else {
      productGroups.set(item.productId, {
        productId: item.productId,
        productNameEn: item.product.nameEn,
        productNameAr: item.product.nameAr,
        icon: item.product.icon,
        location: '', // Would be populated from warehouse location data
        totalQuantity: item.quantity,
        orderIds: [item.orderId],
        picked: item.status === 'picked' || item.status === 'packing' || item.status === 'packed',
      });
    }
  }

  const pickList: PickList = {
    batchId: batch.id,
    warehouseId: batch.warehouseId,
    warehouseName: batch.warehouse.nameEn,
    items: Array.from(productGroups.values()),
    totalProducts: productGroups.size,
    totalQuantity: batch.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
    createdAt: new Date().toISOString(),
  };

  logger.info('Pick list generated', { batchId, totalProducts: pickList.totalProducts });

  return pickList;
}

// ============================================
// BATCH PICKING OPERATIONS
// ============================================

/**
 * Start picking for a fulfillment batch.
 * Transitions batch from 'pending' to 'picking' and all items to 'picking'.
 */
export async function startPicking(batchId: string): Promise<void> {
  const batch = await db.fulfillmentBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  // Validate status transition
  const allowedNext = BATCH_STATUS_TRANSITIONS[batch.status as BatchStatus];
  if (!allowedNext || !allowedNext.includes('picking')) {
    throw new ForbiddenError(
      `Cannot start picking for batch in '${batch.status}' status`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Transition batch to 'picking'
  await db.fulfillmentBatch.update({
    where: { id: batchId },
    data: { status: 'picking', assignedAt: new Date() },
  });

  // Transition all pending items to 'picking'
  await db.fulfillmentBatchItem.updateMany({
    where: { batchId, status: 'pending' },
    data: { status: 'picking' },
  });

  logger.info('Batch picking started', { batchId });
}

/**
 * Complete picking for a fulfillment batch.
 * Transitions batch from 'picking' to 'picked' and items accordingly.
 * Items with pickedQuantity >= quantity become 'picked', otherwise 'short'.
 */
export async function completePicking(
  batchId: string,
  itemUpdates: Array<{ itemId: string; pickedQuantity: number }>
): Promise<void> {
  const batch = await db.fulfillmentBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  if (batch.status !== 'picking') {
    throw new ForbiddenError(
      `Cannot complete picking for batch in '${batch.status}' status`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Update individual item picked quantities and statuses
  for (const update of itemUpdates) {
    const item = batch.items.find((i: { id: string }) => i.id === update.itemId);
    if (!item) {
      throw new NotFoundError(`Batch item ${update.itemId} not found`, 'ITEM_NOT_FOUND');
    }

    const newStatus: BatchItemStatus = update.pickedQuantity >= item.quantity ? 'picked' : 'short';

    const allowedNext = ITEM_STATUS_TRANSITIONS[item.status as BatchItemStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new ForbiddenError(
        `Cannot transition item from '${item.status}' to '${newStatus}'`,
        'INVALID_ITEM_STATUS_TRANSITION'
      );
    }

    await db.fulfillmentBatchItem.update({
      where: { id: update.itemId },
      data: { pickedQuantity: update.pickedQuantity, status: newStatus },
    });
  }

  // Check if all items are either 'picked' or 'short' (picking complete)
  const allItemsProcessed = batch.items.every(
    (item: { id: string; status: string }) =>
      itemUpdates.some((u) => u.itemId === item.id) ||
      item.status === 'picked' ||
      item.status === 'short'
  );

  if (allItemsProcessed) {
    // Transition batch to 'picked'
    await db.fulfillmentBatch.update({
      where: { id: batchId },
      data: { status: 'picked', pickedAt: new Date() },
    });
  }

  logger.info('Batch picking completed', { batchId, itemsUpdated: itemUpdates.length });
}

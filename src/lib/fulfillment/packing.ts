// GGH Fulfillment — Packing operations
// Pack verification, batch packing start/complete operations

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { BATCH_STATUS_TRANSITIONS, ITEM_STATUS_TRANSITIONS } from './config';
import { type BatchStatus, type BatchItemStatus, type PackVerification, type PackVerificationItem } from './types';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

const logger = createLogger('fulfillment-packing');

// ============================================
// PACK VERIFICATION
// ============================================

/**
 * Generate pack verification data for a batch.
 * Lists all orders in the batch with expected vs actual item quantities.
 */
export async function getPackVerification(batchId: string): Promise<PackVerification[]> {
  const batch = await db.fulfillmentBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        include: {
          product: { select: { id: true, nameEn: true, nameAr: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      },
    },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  // Group items by order
  const orderGroups = new Map<string, PackVerification>();

  for (const item of batch.items) {
    const orderId = item.orderId;
    const existing = orderGroups.get(orderId);

    const verificationItem: PackVerificationItem = {
      productId: item.productId,
      productNameEn: item.product.nameEn,
      productNameAr: item.product.nameAr,
      expectedQuantity: item.quantity,
      actualQuantity: item.pickedQuantity,
      verified: item.status === 'packed' || item.status === 'shipped',
    };

    if (existing) {
      existing.items.push(verificationItem);
      existing.allItemsVerified = existing.allItemsVerified && verificationItem.verified;
    } else {
      orderGroups.set(orderId, {
        orderId: item.order.id,
        orderNumber: item.order.orderNumber,
        items: [verificationItem],
        allItemsVerified: verificationItem.verified,
        verifiedAt: null,
      });
    }
  }

  return Array.from(orderGroups.values());
}

// ============================================
// BATCH PACKING OPERATIONS
// ============================================

/**
 * Start packing for a fulfillment batch.
 * Transitions batch from 'picked' to 'packing' and picked items to 'packing'.
 */
export async function startPacking(batchId: string): Promise<void> {
  const batch = await db.fulfillmentBatch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  const allowedNext = BATCH_STATUS_TRANSITIONS[batch.status as BatchStatus];
  if (!allowedNext || !allowedNext.includes('packing')) {
    throw new ForbiddenError(
      `Cannot start packing for batch in '${batch.status}' status`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Transition batch to 'packing'
  await db.fulfillmentBatch.update({
    where: { id: batchId },
    data: { status: 'packing' },
  });

  // Transition all 'picked' items to 'packing'
  await db.fulfillmentBatchItem.updateMany({
    where: { batchId, status: 'picked' },
    data: { status: 'packing' },
  });

  logger.info('Batch packing started', { batchId });
}

/**
 * Complete packing for a fulfillment batch.
 * Transitions batch from 'packing' to 'packed' and items accordingly.
 */
export async function completePacking(
  batchId: string,
  itemVerifications: Array<{ itemId: string; verified: boolean }>
): Promise<void> {
  const batch = await db.fulfillmentBatch.findUnique({
    where: { id: batchId },
    include: { items: true },
  });

  if (!batch) {
    throw new NotFoundError('Fulfillment batch not found', 'BATCH_NOT_FOUND');
  }

  if (batch.status !== 'packing') {
    throw new ForbiddenError(
      `Cannot complete packing for batch in '${batch.status}' status`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Update individual item statuses
  for (const verification of itemVerifications) {
    const item = batch.items.find((i: { id: string }) => i.id === verification.itemId);
    if (!item) {
      throw new NotFoundError(`Batch item ${verification.itemId} not found`, 'ITEM_NOT_FOUND');
    }

    const newStatus: BatchItemStatus = verification.verified ? 'packed' : 'damaged';

    const allowedNext = ITEM_STATUS_TRANSITIONS[item.status as BatchItemStatus];
    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new ForbiddenError(
        `Cannot transition item from '${item.status}' to '${newStatus}'`,
        'INVALID_ITEM_STATUS_TRANSITION'
      );
    }

    await db.fulfillmentBatchItem.update({
      where: { id: verification.itemId },
      data: { status: newStatus },
    });
  }

  // Transition batch to 'packed'
  await db.fulfillmentBatch.update({
    where: { id: batchId },
    data: { status: 'packed', packedAt: new Date() },
  });

  logger.info('Batch packing completed', { batchId, itemsVerified: itemVerifications.length });
}

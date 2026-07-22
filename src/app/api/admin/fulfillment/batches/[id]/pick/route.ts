// GGH Admin Fulfillment — Batch pick operations
// POST start/complete picking for a batch

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { startPicking, completePicking, generatePickList } from '@/lib/fulfillment/picking';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-fulfillment-pick');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const startPickSchema = z.object({
  action: z.literal('start'),
});

const completePickSchema = z.object({
  action: z.literal('complete'),
  itemUpdates: z.array(z.object({
    itemId: z.string().min(1),
    pickedQuantity: z.number().int().min(0),
  })).min(1),
});

const pickActionSchema = z.discriminatedUnion('action', [
  startPickSchema,
  completePickSchema,
]);

// ============================================
// POST — Start or complete picking
// ============================================

export const POST = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const body = await request.json();
  const parsed = pickActionSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid pick action data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  if (data.action === 'start') {
    await startPicking(id);

    // Generate and return pick list
    const pickList = await generatePickList(id);

    logger.info('Batch picking started', { adminId: admin.id, batchId: id });

    return successResponse(pickList, 'Picking started');
  }

  if (data.action === 'complete') {
    await completePicking(id, data.itemUpdates);

    logger.info('Batch picking completed', {
      adminId: admin.id,
      batchId: id,
      itemsUpdated: data.itemUpdates.length,
    });

    return successResponse({ batchId: id, itemsUpdated: data.itemUpdates.length }, 'Picking completed');
  }

  // This should never be reached due to discriminatedUnion validation
  throw new ValidationError('Invalid action', 'INVALID_ACTION');
});

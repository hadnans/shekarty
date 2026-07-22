// GGH Admin Fulfillment — Batch pack operations
// POST start/complete packing for a batch

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { startPacking, completePacking, getPackVerification } from '@/lib/fulfillment/packing';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-fulfillment-pack');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const startPackSchema = z.object({
  action: z.literal('start'),
});

const completePackSchema = z.object({
  action: z.literal('complete'),
  itemVerifications: z.array(z.object({
    itemId: z.string().min(1),
    verified: z.boolean(),
  })).min(1),
});

const packActionSchema = z.discriminatedUnion('action', [
  startPackSchema,
  completePackSchema,
]);

// ============================================
// POST — Start or complete packing
// ============================================

export const POST = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const body = await request.json();
  const parsed = packActionSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid pack action data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  if (data.action === 'start') {
    await startPacking(id);

    // Return pack verification data
    const verificationData = await getPackVerification(id);

    logger.info('Batch packing started', { adminId: admin.id, batchId: id });

    return successResponse(verificationData, 'Packing started');
  }

  if (data.action === 'complete') {
    await completePacking(id, data.itemVerifications);

    logger.info('Batch packing completed', {
      adminId: admin.id,
      batchId: id,
      itemsVerified: data.itemVerifications.length,
    });

    return successResponse({ batchId: id, itemsVerified: data.itemVerifications.length }, 'Packing completed');
  }

  throw new ValidationError('Invalid action', 'INVALID_ACTION');
});

// GGH Admin Fulfillment — Returns: POST initiate return, GET return history
// Uses apiHandler, requireAdminAuthOrThrow

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { initiateReturn, calculateRefund, getReturnHistory } from '@/lib/fulfillment/returns';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-fulfillment-returns');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const initiateReturnSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  reason: z.string().min(1).max(500),
  reasonAr: z.string().default(''),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
  })).min(1),
});

const returnHistorySchema = z.object({
  orderId: z.string().optional(),
  customerId: z.string().optional(),
});

// ============================================
// POST — Initiate a return
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = initiateReturnSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid return data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  // Initiate return
  const returnRequest = await initiateReturn(
    data.orderId,
    data.customerId,
    data.reason,
    data.reasonAr,
    data.items
  );

  // Calculate refund
  const refundCalculation = await calculateRefund(
    data.orderId,
    data.items,
    data.items.length > 0 // full return if all items are being returned
  );

  logger.info('Return initiated by admin', {
    adminId: admin.id,
    orderId: data.orderId,
    customerId: data.customerId,
    totalRefundAmount: refundCalculation.totalRefund,
  });

  return successResponse({
    returnRequest,
    refundCalculation,
  }, 'Return initiated', 201);
});

// ============================================
// GET — Return history
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const parsed = returnHistorySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const returnHistory = await getReturnHistory(data);

  logger.info('Return history fetched', { adminId: admin.id, count: returnHistory.length });

  return successResponse(returnHistory, 'Return history retrieved');
});

// GGH Admin Payment Transaction Detail — GET, PATCH (refund)
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { paymentService } from '@/lib/payment/service';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-payments-transaction-detail');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const refundSchema = z.object({
  action: z.literal('refund'),
  amount: z.number().int().min(0),
  reason: z.string().min(1).max(500),
  reasonAr: z.string().default(''),
  fullRefund: z.boolean().default(false),
});

// ============================================
// GET — Single transaction detail
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const transaction = await db.paymentTransaction.findUnique({
    where: { id },
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found', 'TRANSACTION_NOT_FOUND');
  }

  logger.info('Transaction detail fetched', { adminId: admin.id, transactionId: id });

  return successResponse({
    id: transaction.id,
    orderId: transaction.orderId,
    orderNumber: transaction.order.orderNumber,
    customerId: transaction.customerId,
    customerName: `${transaction.customer.firstName} ${transaction.customer.lastName}`,
    customerPhone: transaction.customer.phone,
    provider: transaction.provider,
    providerTxId: transaction.providerTxId,
    amount: transaction.amount,
    status: transaction.status,
    method: transaction.method,
    metadata: transaction.metadata,
    refundAmount: transaction.refundAmount,
    failureReason: transaction.failureReason,
    processedAt: transaction.processedAt?.toISOString() ?? null,
    refundedAt: transaction.refundedAt?.toISOString() ?? null,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  }, 'Transaction retrieved');
});

// ============================================
// PATCH — Refund a transaction
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const body = await request.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid refund data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  // Process refund via payment service
  const refundResult = await paymentService.processRefund({
    transactionId: id,
    amount: data.amount,
    reason: data.reason,
    reasonAr: data.reasonAr,
    fullRefund: data.fullRefund,
  });

  logger.info('Transaction refund processed', {
    adminId: admin.id,
    transactionId: id,
    refundAmount: data.amount,
    success: refundResult.success,
  });

  return successResponse(refundResult, refundResult.success ? 'Refund processed' : 'Refund failed');
});

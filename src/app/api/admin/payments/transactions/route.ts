// GGH Admin Payment Transactions — GET transaction list
// Uses apiHandler, requireAdminAuthOrThrow

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { paginatedResponse } from '@/lib/ggh/auth';
import { paymentService } from '@/lib/payment/service';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-payments-transactions');

// ============================================
// VALIDATION
// ============================================

const transactionListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  provider: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
});

// ============================================
// GET — Transaction list with filters
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const parsed = transactionListSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  const result = await paymentService.getTransactionList({
    status: data.status,
    provider: data.provider,
    orderId: data.orderId,
    customerId: data.customerId,
    page: data.page,
    limit: data.limit,
  });

  logger.info('Payment transactions listed', { adminId: admin.id, total: result.total });

  return paginatedResponse(result.transactions, data.page, data.limit, result.total);
});

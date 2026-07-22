// GGH Admin — Loyalty Transactions List
// GET: List loyalty transactions (filterable by customer, program, type)

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { paginatedResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { listTransactions } from '@/lib/loyalty';
import { TRANSACTION_TYPES } from '@/lib/loyalty/config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-loyalty-transactions');

// ============================================
// VALIDATION SCHEMA
// ============================================

const listTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  customerId: z.string().optional(),
  programId: z.string().optional(),
  type: z.enum([...TRANSACTION_TYPES, 'all'] as [string, ...string[]]).default('all'),
});

// ============================================
// GET — List Transactions
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = listTransactionsSchema.parse(queryParams);
  const { page, limit, customerId, programId, type } = validated;

  const typeFilter = type === 'all' ? undefined : type;

  const result = await listTransactions(customerId, programId, typeFilter, page, limit);

  logger.info('Admin listed loyalty transactions', {
    adminId: admin.id,
    page,
    limit,
    total: result.total,
    customerId,
    programId,
  });

  return paginatedResponse(result.transactions, page, limit, result.total);
});

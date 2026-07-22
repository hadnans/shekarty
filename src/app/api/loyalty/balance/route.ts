// GGH — Customer Loyalty Balance
// GET: Customer-facing loyalty balance check

import { NextRequest } from 'next/server';
import { apiHandler, UnauthorizedError } from '@/lib/errors';
import { successResponse } from '@/lib/ggh/auth';
import { getAuthenticatedCustomer } from '@/lib/ggh/auth';
import { z } from 'zod';
import { checkBalance } from '@/lib/loyalty';
import { createLogger } from '@/lib/logger';

const logger = createLogger('loyalty-balance');

// ============================================
// VALIDATION SCHEMA
// ============================================

const balanceSchema = z.object({
  programId: z.string().min(1, 'Program ID is required'),
});

// ============================================
// GET — Customer Loyalty Balance
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    throw new UnauthorizedError('Authentication required', 'CUSTOMER_UNAUTHORIZED');
  }

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = balanceSchema.parse(queryParams);
  const { programId } = validated;

  const balance = await checkBalance(customer.id, programId);

  logger.info('Customer checked loyalty balance', {
    customerId: customer.id,
    programId,
    currentPoints: balance.currentPoints,
  });

  return successResponse(balance);
});

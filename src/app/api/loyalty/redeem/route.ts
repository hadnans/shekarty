// GGH — Customer Loyalty Redemption
// POST: Customer-facing loyalty points redemption

import { NextRequest } from 'next/server';
import { apiHandler, UnauthorizedError, ValidationError } from '@/lib/errors';
import { successResponse } from '@/lib/ggh/auth';
import { getAuthenticatedCustomer } from '@/lib/ggh/auth';
import { z } from 'zod';
import { redeemPoints } from '@/lib/loyalty';
import { createLogger } from '@/lib/logger';

const logger = createLogger('loyalty-redeem');

// ============================================
// VALIDATION SCHEMA
// ============================================

const redeemSchema = z.object({
  programId: z.string().min(1, 'Program ID is required'),
  points: z.number().int().positive('Points must be positive'),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  orderId: z.string().optional(),
});

// ============================================
// POST — Redeem Points
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    throw new UnauthorizedError('Authentication required', 'CUSTOMER_UNAUTHORIZED');
  }

  const body = await request.json();
  const validated = redeemSchema.safeParse(body);

  if (!validated.success) {
    throw new ValidationError(
      'Invalid redemption data',
      'INVALID_REDEMPTION_DATA',
      validated.error.flatten().fieldErrors
    );
  }

  const transaction = await redeemPoints({
    customerId: customer.id,
    programId: validated.data.programId,
    points: validated.data.points,
    descriptionEn: validated.data.descriptionEn,
    descriptionAr: validated.data.descriptionAr,
    orderId: validated.data.orderId,
  });

  logger.info('Customer redeemed loyalty points', {
    customerId: customer.id,
    programId: validated.data.programId,
    points: validated.data.points,
  });

  return successResponse(transaction, 'Points redeemed successfully');
});

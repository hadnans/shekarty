// GGH Customer-Facing — Create payment intent
// POST create payment intent for a customer order

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { successResponse } from '@/lib/ggh/auth';
import { getAuthenticatedCustomer } from '@/lib/ggh/auth';
import { paymentService } from '@/lib/payment/service';
import { PAYMENT_CURRENCY } from '@/lib/payment/config';
import { type PaymentMethodType } from '@/lib/payment/types';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('payments-intent');

// ============================================
// VALIDATION
// ============================================

const createIntentSchema = z.object({
  orderId: z.string().min(1),
  method: z.enum(['cod', 'card', 'wallet', 'fawry_card', 'fawry_cash', 'valu', 'instapay']),
  returnUrl: z.string().optional(),
});

// ============================================
// POST — Create payment intent (customer-facing)
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  // Require customer authentication
  const customer = await getAuthenticatedCustomer();
  if (!customer) {
    throw new ForbiddenError('Customer authentication required', 'CUSTOMER_UNAUTHORIZED');
  }

  const body = await request.json();
  const parsed = createIntentSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid payment intent data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  // Verify order exists and belongs to this customer
  const order = await db.order.findUnique({
    where: { id: data.orderId },
  });

  if (!order) {
    throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.customerId !== customer.id) {
    throw new ForbiddenError('Order does not belong to this customer', 'ORDER_NOT_OWNED');
  }

  // Verify order is in a valid status for payment
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new ValidationError(
      `Order in '${order.status}' status cannot accept payments`,
      'INVALID_ORDER_STATUS'
    );
  }

  // Create payment intent
  const intent = await paymentService.createPaymentIntent({
    orderId: data.orderId,
    customerId: customer.id,
    amount: order.totalAmount as unknown as number,
    currency: PAYMENT_CURRENCY,
    method: data.method as PaymentMethodType,
    returnUrl: data.returnUrl,
    metadata: {
      orderNumber: order.orderNumber,
      customerPhone: customer.phone,
    },
  });

  logger.info('Payment intent created (customer)', {
    customerId: customer.id,
    orderId: data.orderId,
    method: data.method,
    amount: order.totalAmount,
  });

  return successResponse(intent, 'Payment intent created', 201);
});

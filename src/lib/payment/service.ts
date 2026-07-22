// GGH Payment — PaymentService orchestrating providers and creating transactions in DB
// Central service layer that coordinates payment operations across providers

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { type Piastres } from '@/types/ggh';
import { MIN_TRANSACTION_AMOUNT, MAX_TRANSACTION_AMOUNT, INTENT_EXPIRY_MINUTES, PAYMENT_CURRENCY } from './config';
import {
  type PaymentIntent,
  type PaymentResult,
  type RefundRequest,
  type RefundResult,
  type PaymentIntentStatus,
  type PaymentMethodType,
} from './types';
import { type CreateIntentParams } from './provider-interface';
import { selectProvider, getProvider } from './providers';
import { ValidationError, NotFoundError } from '@/lib/errors';

const logger = createLogger('payment-service');

// ============================================
// PAYMENT SERVICE CLASS
// ============================================

export class PaymentService {
  /**
   * Create a payment intent for an order.
   * Selects the appropriate provider based on the payment method.
   */
  async createPaymentIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    // Validate amount
    if (params.amount < (MIN_TRANSACTION_AMOUNT as Piastres)) {
      throw new ValidationError(
        `Payment amount must be at least ${MIN_TRANSACTION_AMOUNT / 100} EGP`,
        'AMOUNT_TOO_SMALL'
      );
    }
    if (params.amount > (MAX_TRANSACTION_AMOUNT as Piastres)) {
      throw new ValidationError(
        `Payment amount must not exceed ${MAX_TRANSACTION_AMOUNT / 100} EGP`,
        'AMOUNT_TOO_LARGE'
      );
    }

    // Select provider based on method
    const provider = selectProvider(params.method);

    // Verify provider is configured
    const config = provider.getConfig();
    if (!config.isConfigured) {
      throw new ValidationError(
        `Payment provider '${config.nameEn}' is not configured`,
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    // Verify provider supports this method
    if (!config.supportedMethods.includes(params.method)) {
      throw new ValidationError(
        `Provider '${config.nameEn}' does not support payment method '${params.method}'`,
        'METHOD_NOT_SUPPORTED'
      );
    }

    // Create intent via provider
    const intent = await provider.createIntent({
      ...params,
      currency: params.currency || PAYMENT_CURRENCY,
    });

    logger.info('Payment intent created via service', {
      orderId: params.orderId,
      provider: provider.code,
      method: params.method,
      amount: params.amount,
    });

    return intent;
  }

  /**
   * Capture a payment — mark as paid.
   * Used for COD upon delivery or for card payments after authorization.
   */
  async capturePayment(
    transactionId: string,
    amount: Piastres,
    method?: PaymentMethodType
  ): Promise<PaymentResult> {
    const transaction = await db.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    const provider = getProvider(transaction.provider);
    if (!provider) {
      throw new ValidationError(
        `Payment provider '${transaction.provider}' not found`,
        'PROVIDER_NOT_FOUND'
      );
    }

    const result = await provider.capture({
      intentId: transactionId,
      providerIntentId: transaction.providerTxId,
      amount,
      orderId: transaction.orderId,
    });

    // Update order payment status
    if (result.success) {
      await db.order.update({
        where: { id: transaction.orderId },
        data: { paymentStatus: 'paid' },
      });
    }

    logger.info('Payment captured', {
      transactionId,
      provider: provider.code,
      success: result.success,
    });

    return result;
  }

  /**
   * Process a refund for a transaction.
   * Routes to the appropriate provider for refund processing.
   */
  async processRefund(params: RefundRequest): Promise<RefundResult> {
    const transaction = await db.paymentTransaction.findUnique({
      where: { id: params.transactionId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found', 'TRANSACTION_NOT_FOUND');
    }

    if (transaction.status !== 'paid') {
      throw new ValidationError(
        `Cannot refund a transaction in '${transaction.status}' status`,
        'INVALID_REFUND_STATUS'
      );
    }

    const provider = getProvider(transaction.provider);
    if (!provider) {
      throw new ValidationError(
        `Payment provider '${transaction.provider}' not found`,
        'PROVIDER_NOT_FOUND'
      );
    }

    const result = await provider.refund(params);

    // Update order payment status if full refund
    if (result.success && params.fullRefund) {
      await db.order.update({
        where: { id: transaction.orderId },
        data: { paymentStatus: 'refunded' },
      });
    }

    logger.info('Refund processed', {
      transactionId: params.transactionId,
      provider: provider.code,
      success: result.success,
      refundAmount: result.refundedAmount,
    });

    return result;
  }

  /**
   * Get transaction list for admin dashboard.
   */
  async getTransactionList(
    filters?: {
      status?: string;
      provider?: string;
      orderId?: string;
      customerId?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ transactions: unknown[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.provider) where.provider = filters.provider;
    if (filters?.orderId) where.orderId = filters.orderId;
    if (filters?.customerId) where.customerId = filters.customerId;

    const [transactions, total] = await Promise.all([
      db.paymentTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      db.paymentTransaction.count({ where }),
    ]);

    return { transactions, total };
  }
}

// Singleton instance
export const paymentService = new PaymentService();

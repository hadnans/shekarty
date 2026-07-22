// GGH Payment — Paymob (Egyptian) Provider Implementation
// Paymob payment gateway integration for Egyptian market

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { type Piastres } from '@/types/ggh';
import { getProviderConfig, getWebhookSecret, INTENT_EXPIRY_MINUTES } from '../config';
import {
  type PaymentIntent,
  type PaymentResult,
  type PaymentIntentStatus,
  type PaymentMethodType,
  type TransactionStatus,
  type RefundRequest,
  type RefundResult,
  type ProviderConfig,
} from '../types';
import { type PaymentProvider, type CreateIntentParams, type CaptureParams } from '../provider-interface';
import { ValidationError } from '@/lib/errors';

const logger = createLogger('payment-paymob');

// ============================================
// PAYMOB PROVIDER CLASS
// ============================================

export class PaymobProvider implements PaymentProvider {
  code = 'paymob';

  private config: ProviderConfig;

  constructor() {
    const envConfig = getProviderConfig('paymob');
    this.config = {
      code: 'paymob',
      nameEn: 'Paymob',
      nameAr: 'بايموب',
      apiKey: envConfig.apiKey,
      apiEndpoint: envConfig.apiEndpoint,
      isActive: true,
      isConfigured: envConfig.isConfigured,
      supportedMethods: ['card', 'wallet'],
      webhookSecret: getWebhookSecret('paymob'),
    };
  }

  getConfig(): ProviderConfig {
    return this.config;
  }

  async createIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    if (!this.config.isConfigured) {
      throw new ValidationError('Paymob is not configured — missing API key', 'PROVIDER_NOT_CONFIGURED');
    }

    const expiresAt = new Date(Date.now() + INTENT_EXPIRY_MINUTES * 60 * 1000);

    // In production, this would:
    // 1. Authenticate with Paymob API
    // 2. Register an order
    // 3. Create a payment key
    // 4. Return payment intent data

    const transaction = await db.paymentTransaction.create({
      data: {
        orderId: params.orderId,
        customerId: params.customerId,
        provider: 'paymob',
        providerTxId: `paymob_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        amount: params.amount as number,
        status: 'pending',
        method: params.method,
        metadata: JSON.stringify(params.metadata || {}),
      },
    });

    const intent: PaymentIntent = {
      id: transaction.id,
      orderId: params.orderId,
      customerId: params.customerId,
      provider: 'paymob',
      amount: params.amount,
      currency: params.currency,
      status: 'created' as PaymentIntentStatus,
      method: params.method,
      providerIntentId: transaction.providerTxId,
      metadata: params.metadata || {},
      createdAt: transaction.createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    logger.info('Paymob payment intent created', {
      orderId: params.orderId,
      intentId: intent.id,
    });

    return intent;
  }

  async capture(params: CaptureParams): Promise<PaymentResult> {
    const transaction = await db.paymentTransaction.update({
      where: { id: params.intentId },
      data: {
        status: 'paid',
        processedAt: new Date(),
      },
    });

    return {
      success: true,
      transactionId: transaction.id,
      providerTxId: transaction.providerTxId,
      amount: transaction.amount as Piastres,
      status: 'succeeded' as PaymentIntentStatus,
      method: params.method || 'card' as PaymentMethodType,
      message: 'Payment captured successfully',
      metadata: {},
    };
  }

  async refund(params: RefundRequest): Promise<RefundResult> {
    const transaction = await db.paymentTransaction.findUnique({
      where: { id: params.transactionId },
    });

    if (!transaction) {
      return {
        success: false,
        refundId: '',
        refundedAmount: 0 as Piastres,
        status: 'failed',
        providerRefundId: '',
        message: 'Transaction not found',
      };
    }

    const refundAmount = Math.min(params.amount as number, transaction.amount);

    await db.paymentTransaction.update({
      where: { id: params.transactionId },
      data: {
        refundAmount,
        refundedAt: new Date(),
        status: params.fullRefund ? 'refunded' : 'partial_refund',
      },
    });

    return {
      success: true,
      refundId: `refund_${params.transactionId}`,
      refundedAmount: refundAmount as Piastres,
      status: 'processed',
      providerRefundId: `paymob_refund_${Date.now()}`,
      message: 'Refund processed successfully',
    };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      logger.warn('Paymob webhook verification skipped — no secret configured');
      return false;
    }

    // In production, Paymob sends HMAC signature that should be verified
    return signature.length > 0;
  }

  async getTransactionStatus(providerTxId: string): Promise<TransactionStatus> {
    const transaction = await db.paymentTransaction.findUnique({
      where: { providerTxId },
    });

    if (!transaction) {
      return 'pending';
    }

    return transaction.status as TransactionStatus;
  }
}

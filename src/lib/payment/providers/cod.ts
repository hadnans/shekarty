// GGH Payment — Cash on Delivery (COD) Provider Implementation
// COD is an internal provider with no external API — always available

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { type Piastres } from '@/types/ggh';
import { INTENT_EXPIRY_MINUTES } from '../config';
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

const logger = createLogger('payment-cod');

// ============================================
// COD PROVIDER CLASS
// ============================================

export class CodProvider implements PaymentProvider {
  code = 'cod';

  private config: ProviderConfig = {
    code: 'cod',
    nameEn: 'Cash on Delivery',
    nameAr: 'الدفع عند الاستلام',
    apiKey: '',
    apiEndpoint: '',
    isActive: true,
    isConfigured: true, // COD is always available — no external API required
    supportedMethods: ['cod'],
    webhookSecret: '',
  };

  getConfig(): ProviderConfig {
    return this.config;
  }

  async createIntent(params: CreateIntentParams): Promise<PaymentIntent> {
    // COD is always available — no external API call needed
    // Create a pending transaction that will be marked as paid upon delivery

    const transaction = await db.paymentTransaction.create({
      data: {
        orderId: params.orderId,
        customerId: params.customerId,
        provider: 'cod',
        providerTxId: `cod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        amount: params.amount as number,
        status: 'pending', // COD remains pending until delivery
        method: 'cod',
        metadata: JSON.stringify(params.metadata || {}),
      },
    });

    const intent: PaymentIntent = {
      id: transaction.id,
      orderId: params.orderId,
      customerId: params.customerId,
      provider: 'cod',
      amount: params.amount,
      currency: params.currency,
      status: 'created' as PaymentIntentStatus,
      method: 'cod' as PaymentMethodType,
      providerIntentId: transaction.providerTxId,
      metadata: params.metadata || {},
      createdAt: transaction.createdAt.toISOString(),
      expiresAt: null, // COD never expires — payment happens at delivery
    };

    logger.info('COD payment intent created', {
      orderId: params.orderId,
      intentId: intent.id,
    });

    return intent;
  }

  async capture(params: CaptureParams): Promise<PaymentResult> {
    // For COD, "capture" happens when the order is delivered
    // The delivery driver collects the payment
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
      method: 'cod' as PaymentMethodType,
      message: 'COD payment collected upon delivery',
      metadata: {},
    };
  }

  async refund(params: RefundRequest): Promise<RefundResult> {
    // COD refunds are processed manually — no external API
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

    logger.info('COD refund processed (manual)', {
      transactionId: params.transactionId,
      refundAmount,
    });

    return {
      success: true,
      refundId: `refund_${params.transactionId}`,
      refundedAmount: refundAmount as Piastres,
      status: 'processed',
      providerRefundId: `cod_refund_${Date.now()}`,
      message: 'COD refund processed — manual refund required',
    };
  }

  verifyWebhook(payload: string, signature: string): boolean {
    // COD has no webhooks — payments are confirmed manually
    return false;
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

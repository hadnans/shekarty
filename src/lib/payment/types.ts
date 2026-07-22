// GGH Payment Types — Type definitions for the payment gateway system

import { type Piastres } from '@/types/ggh';

// ============================================
// PAYMENT INTENT
// ============================================

/** Payment intent — represents a payment that needs to be processed */
export interface PaymentIntent {
  id: string;
  orderId: string;
  customerId: string;
  provider: string;
  amount: Piastres;
  currency: string;
  status: PaymentIntentStatus;
  method: PaymentMethodType;
  providerIntentId: string;
  metadata: Record<string, string>;
  createdAt: string;
  expiresAt: string | null;
}

export type PaymentIntentStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired';

// ============================================
// PAYMENT METHOD
// ============================================

/** Payment method types supported by the platform */
export type PaymentMethodType =
  | 'cod'          // Cash on Delivery
  | 'card'         // Credit/Debit card (via Paymob/Stripe)
  | 'wallet'       // Mobile wallet (via Paymob/Fawry)
  | 'fawry_card'   // Fawry card payment
  | 'fawry_cash'   // Fawry cash payment at Fawry outlets
  | 'valu'         // ValU installment
  | 'instapay';    // InstaPay transfer

// ============================================
// REFUND REQUEST
// ============================================

/** Refund request — represents a refund to be processed */
export interface RefundRequest {
  transactionId: string;
  amount: Piastres;
  reason: string;
  reasonAr: string;
  fullRefund: boolean;
}

/** Refund result — outcome of a refund operation */
export interface RefundResult {
  success: boolean;
  refundId: string;
  refundedAmount: Piastres;
  status: 'pending' | 'processed' | 'failed';
  providerRefundId: string;
  message: string;
}

// ============================================
// PAYMENT RESULT
// ============================================

/** Payment result — outcome of a payment operation */
export interface PaymentResult {
  success: boolean;
  transactionId: string;
  providerTxId: string;
  amount: Piastres;
  status: PaymentIntentStatus;
  method: PaymentMethodType;
  message: string;
  metadata: Record<string, string>;
}

// ============================================
// PROVIDER CONFIG
// ============================================

/** Payment provider configuration */
export interface ProviderConfig {
  code: string;
  nameEn: string;
  nameAr: string;
  apiKey: string;
  apiEndpoint: string;
  isActive: boolean;
  isConfigured: boolean;
  supportedMethods: PaymentMethodType[];
  webhookSecret: string;
}

// ============================================
// WEBHOOK EVENT
// ============================================

/** Payment webhook event from a provider */
export interface WebhookEvent {
  provider: string;
  eventType: string;
  transactionId: string;
  providerTxId: string;
  amount: Piastres;
  currency: string;
  status: PaymentIntentStatus;
  orderId: string;
  customerId: string;
  metadata: Record<string, string>;
  rawPayload: string;
  receivedAt: string;
}

// ============================================
// TRANSACTION STATUS
// ============================================

/** Transaction status in the database */
export type TransactionStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partial_refund'
  | 'cancelled';

// ============================================
// HELPERS
// ============================================

/** Get the payment method label in the specified language */
export function getPaymentMethodLabel(method: PaymentMethodType, lang: 'en' | 'ar'): string {
  const labels: Record<PaymentMethodType, { en: string; ar: string }> = {
    cod: { en: 'Cash on Delivery', ar: 'الدفع عند الاستلام' },
    card: { en: 'Card Payment', ar: 'الدفع بالبطاقة' },
    wallet: { en: 'Mobile Wallet', ar: 'محفظة موبايل' },
    fawry_card: { en: 'Fawry Card', ar: 'فوري بطاقة' },
    fawry_cash: { en: 'Fawry Cash', ar: 'فوري كاش' },
    valu: { en: 'ValU Installment', ar: 'فاليو تقسيط' },
    instapay: { en: 'InstaPay', ar: 'انستاباي' },
  };
  return lang === 'ar' ? labels[method].ar : labels[method].en;
}

/** Get the transaction status label in the specified language */
export function getTransactionStatusLabel(status: TransactionStatus, lang: 'en' | 'ar'): string {
  const labels: Record<TransactionStatus, { en: string; ar: string }> = {
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
    paid: { en: 'Paid', ar: 'مدفوع' },
    failed: { en: 'Failed', ar: 'فشل' },
    refunded: { en: 'Refunded', ar: 'مسترد' },
    partial_refund: { en: 'Partial Refund', ar: 'استرداد جزئي' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };
  return lang === 'ar' ? labels[status].ar : labels[status].en;
}

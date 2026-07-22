// GGH Payment — Abstract PaymentProvider interface
// All payment providers must implement this interface
// Enables modular, extensible payment gateway architecture

import {
  type PaymentIntent,
  type PaymentResult,
  type RefundRequest,
  type RefundResult,
  type ProviderConfig,
  type WebhookEvent,
  type Piastres,
} from '@/types/ggh';
import { type PaymentIntentStatus, type PaymentMethodType, type TransactionStatus } from './types';

// ============================================
// ABSTRACT PAYMENT PROVIDER INTERFACE
// ============================================

/**
 * PaymentProvider — abstract interface that all payment gateway implementations must follow.
 * Each provider (Stripe, Paymob, Fawry, COD) implements these methods.
 */
export interface PaymentProvider {
  /** Unique provider code (e.g., 'stripe', 'paymob', 'fawry', 'cod') */
  code: string;

  /** Get provider configuration */
  getConfig(): ProviderConfig;

  /**
   * Create a payment intent — initiates a payment flow.
   * Returns intent data including provider-specific ID for tracking.
   */
  createIntent(params: CreateIntentParams): Promise<PaymentIntent>;

  /**
   * Capture a previously authorized payment.
   * Used for two-step payment flows (authorize first, capture later).
   */
  capture(params: CaptureParams): Promise<PaymentResult>;

  /**
   * Process a refund for a completed payment.
   * Supports full and partial refunds.
   */
  refund(params: RefundRequest): Promise<RefundResult>;

  /**
   * Verify a webhook signature from the provider.
   * Returns true if the signature is valid.
   */
  verifyWebhook(payload: string, signature: string): boolean;

  /**
   * Get the current status of a transaction from the provider.
   * Used for reconciliation and status updates.
   */
  getTransactionStatus(providerTxId: string): Promise<TransactionStatus>;
}

// ============================================
// PARAMETER TYPES
// ============================================

/** Parameters for creating a payment intent */
export interface CreateIntentParams {
  orderId: string;
  customerId: string;
  amount: Piastres;
  currency: string;
  method: PaymentMethodType;
  metadata?: Record<string, string>;
  /** Customer-facing redirect URL after payment completion */
  returnUrl?: string;
  /** Webhook notification URL for the provider */
  webhookUrl?: string;
}

/** Parameters for capturing a payment */
export interface CaptureParams {
  intentId: string;
  providerIntentId: string;
  amount: Piastres;
  orderId: string;
}

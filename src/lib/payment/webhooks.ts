// GGH Payment — Webhook signature verification for each provider
// Routes webhook events to the correct provider for verification and processing

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { SUPPORTED_PROVIDERS, type ProviderCode } from './config';
import {
  type WebhookEvent,
  type PaymentIntentStatus,
} from './types';
import { getProvider } from './providers';
import { ValidationError, NotFoundError } from '@/lib/errors';

const logger = createLogger('payment-webhooks');

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Verify a webhook event from a payment provider.
 * Routes to the correct provider for signature verification.
 */
export function verifyProviderWebhook(
  provider: string,
  payload: string,
  signature: string
): boolean {
  const providerInstance = getProvider(provider);
  if (!providerInstance) {
    logger.warn('Webhook received for unknown provider', { provider });
    return false;
  }

  return providerInstance.verifyWebhook(payload, signature);
}

// ============================================
// WEBHOOK EVENT PROCESSING
// ============================================

/**
 * Process a verified webhook event from a payment provider.
 * Updates the corresponding transaction status in the database.
 */
export async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  logger.info('Processing webhook event', {
    provider: event.provider,
    eventType: event.eventType,
    transactionId: event.transactionId,
    providerTxId: event.providerTxId,
  });

  // Find the transaction by providerTxId
  const transaction = await db.paymentTransaction.findUnique({
    where: { providerTxId: event.providerTxId },
  });

  if (!transaction) {
    logger.warn('Webhook event for unknown transaction', {
      providerTxId: event.providerTxId,
    });
    return;
  }

  // Map provider status to our transaction status
  const statusMap: Record<string, string> = {
    succeeded: 'paid',
    successful: 'paid',
    paid: 'paid',
    captured: 'paid',
    failed: 'failed',
    declined: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    partial_refunded: 'partial_refund',
    expired: 'failed',
    pending: 'pending',
  };

  const mappedStatus = statusMap[event.status] || event.status;

  // Update transaction status
  await db.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: mappedStatus,
      ...(mappedStatus === 'paid' ? { processedAt: new Date() } : {}),
      ...(mappedStatus === 'failed' ? { failureReason: event.metadata.failureReason || 'Provider reported failure' } : {}),
      ...(mappedStatus.includes('refund') ? { refundedAt: new Date() } : {}),
    },
  });

  // Update order payment status accordingly
  if (mappedStatus === 'paid') {
    await db.order.update({
      where: { id: transaction.orderId },
      data: { paymentStatus: 'paid' },
    });
  } else if (mappedStatus === 'failed') {
    await db.order.update({
      where: { id: transaction.orderId },
      data: { paymentStatus: 'failed' },
    });
  } else if (mappedStatus === 'refunded') {
    await db.order.update({
      where: { id: transaction.orderId },
      data: { paymentStatus: 'refunded' },
    });
  }

  logger.info('Webhook event processed successfully', {
    transactionId: transaction.id,
    mappedStatus,
    orderId: transaction.orderId,
  });
}

// ============================================
// WEBHOOK EVENT CONSTRUCTION
// ============================================

/**
 * Construct a WebhookEvent from raw provider payload.
 * Each provider has its own payload format — this function parses it.
 */
export function constructWebhookEvent(
  provider: ProviderCode,
  payload: string,
  headers: Record<string, string>
): WebhookEvent {
  // Parse the payload based on provider
  const parsed = JSON.parse(payload);

  switch (provider) {
    case 'paymob':
      return constructPaymobEvent(parsed, headers);
    case 'fawry':
      return constructFawryEvent(parsed, headers);
    case 'stripe':
      return constructStripeEvent(parsed, headers);
    case 'cod':
      // COD has no webhooks
      throw new ValidationError('COD provider does not send webhooks', 'NO_COD_WEBHOOKS');
    default:
      throw new ValidationError(`Unknown provider: ${provider}`, 'UNKNOWN_PROVIDER');
  }
}

// ============================================
// PROVIDER-SPECIFIC EVENT CONSTRUCTION
// ============================================

function constructPaymobEvent(
  parsed: Record<string, unknown>,
  headers: Record<string, string>
): WebhookEvent {
  // Paymob webhook format
  const obj = parsed.obj || parsed;
  return {
    provider: 'paymob',
    eventType: parsed.type || 'payment.completed',
    transactionId: '', // Will be matched via providerTxId
    providerTxId: String(obj.id || ''),
    amount: (Number(obj.amount_cents || 0)) as unknown as number,
    currency: String(obj.currency || 'EGP'),
    status: mapPaymobStatus(String(obj.success || '')),
    orderId: String(obj.order || obj.order_id || ''),
    customerId: String(obj.profile_id || ''),
    metadata: {},
    rawPayload: JSON.stringify(parsed),
    receivedAt: new Date().toISOString(),
  };
}

function constructFawryEvent(
  parsed: Record<string, unknown>,
  headers: Record<string, string>
): WebhookEvent {
  return {
    provider: 'fawry',
    eventType: String(parsed.messageType || 'chargeResponse'),
    transactionId: '',
    providerTxId: String(parsed.fawryRefNumber || ''),
    amount: (Number(parsed.invoiceAmount || 0)) as unknown as number,
    currency: 'EGP',
    status: mapFawryStatus(String(parsed.orderStatus || '')),
    orderId: String(parsed.merchantRefNumber || ''),
    customerId: String(parsed.customerMobile || ''),
    metadata: {},
    rawPayload: JSON.stringify(parsed),
    receivedAt: new Date().toISOString(),
  };
}

function constructStripeEvent(
  parsed: Record<string, unknown>,
  headers: Record<string, string>
): WebhookEvent {
  const data = parsed.data?.object as Record<string, unknown> || {};
  return {
    provider: 'stripe',
    eventType: String(parsed.type || 'payment_intent.succeeded'),
    transactionId: '',
    providerTxId: String(data.id || ''),
    amount: (Number(data.amount || 0)) as unknown as number,
    currency: String(data.currency || 'egp'),
    status: mapStripeStatus(String(data.status || '')),
    orderId: String(data.metadata?.orderId || ''),
    customerId: String(data.metadata?.customerId || ''),
    metadata: (data.metadata || {}) as Record<string, string>,
    rawPayload: JSON.stringify(parsed),
    receivedAt: new Date().toISOString(),
  };
}

// ============================================
// STATUS MAPPING HELPERS
// ============================================

function mapPaymobStatus(success: string): PaymentIntentStatus {
  if (success === 'true' || success === 'True') return 'succeeded';
  return 'failed';
}

function mapFawryStatus(orderStatus: string): PaymentIntentStatus {
  switch (orderStatus) {
    case 'PAID': return 'succeeded';
    case 'UNPAID': return 'pending';
    case 'EXPIRED': return 'expired';
    case 'REFUNDED': return 'succeeded'; // refund completed
    case 'PARTIALLY_REFUNDED': return 'succeeded';
    case 'FAILED': return 'failed';
    default: return 'pending';
  }
}

function mapStripeStatus(status: string): PaymentIntentStatus {
  switch (status) {
    case 'succeeded': return 'succeeded';
    case 'requires_payment_method': return 'pending';
    case 'requires_confirmation': return 'pending';
    case 'requires_action': return 'pending';
    case 'processing': return 'processing';
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

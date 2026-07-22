// GGH Payment System — Barrel export
// Re-exports all payment system modules

// Configuration
export {
  DEFAULT_PAYMENT_PROVIDER,
  SUPPORTED_PROVIDERS,
  PAYMENT_CURRENCY,
  MIN_TRANSACTION_AMOUNT,
  MAX_TRANSACTION_AMOUNT,
  INTENT_EXPIRY_MINUTES,
  getProviderConfig,
  getWebhookSecret,
  type ProviderCode,
} from './config';

// Types
export {
  type PaymentIntent,
  type PaymentIntentStatus,
  type PaymentMethodType,
  type RefundRequest,
  type RefundResult,
  type PaymentResult,
  type ProviderConfig,
  type WebhookEvent,
  type TransactionStatus,
  getPaymentMethodLabel,
  getTransactionStatusLabel,
} from './types';

// Provider Interface
export {
  type PaymentProvider,
  type CreateIntentParams,
  type CaptureParams,
} from './provider-interface';

// Providers
export {
  StripeProvider,
} from './providers/stripe';

export {
  PaymobProvider,
} from './providers/paymob';

export {
  FawryProvider,
} from './providers/fawry';

export {
  CodProvider,
} from './providers/cod';

export {
  getProvider,
  selectProvider,
  getAllProviderConfigs,
  getProvidersForMethod,
} from './providers';

// Service
export {
  PaymentService,
  paymentService,
} from './service';

// Webhooks
export {
  verifyProviderWebhook,
  processWebhookEvent,
  constructWebhookEvent,
} from './webhooks';

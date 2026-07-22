// GGH Payment Gateway Configuration
// Centralized configuration for payment providers, loaded from environment variables

/** Default payment provider — used when no provider specified */
export const DEFAULT_PAYMENT_PROVIDER = 'cod';

/** Supported payment provider codes */
export const SUPPORTED_PROVIDERS = ['cod', 'paymob', 'fawry', 'stripe'] as const;

/** Provider code type */
export type ProviderCode = (typeof SUPPORTED_PROVIDERS)[number];

/** Payment gateway configuration from environment */
export function getProviderConfig(provider: ProviderCode): {
  apiKey: string;
  apiEndpoint: string;
  isConfigured: boolean;
} {
  switch (provider) {
    case 'paymob':
      return {
        apiKey: process.env.PAYMOB_API_KEY || '',
        apiEndpoint: process.env.PAYMOB_API_ENDPOINT || 'https://accept.paymobsolutions.com/api',
        isConfigured: !!process.env.PAYMOB_API_KEY,
      };
    case 'fawry':
      return {
        apiKey: process.env.FAWRY_API_KEY || '',
        apiEndpoint: process.env.FAWRY_API_ENDPOINT || 'https://atfawry.fawry.com/fawrypay-api',
        isConfigured: !!process.env.FAWRY_API_KEY,
      };
    case 'stripe':
      return {
        apiKey: process.env.STRIPE_SECRET_KEY || '',
        apiEndpoint: process.env.STRIPE_API_ENDPOINT || 'https://api.stripe.com/v1',
        isConfigured: !!process.env.STRIPE_SECRET_KEY,
      };
    case 'cod':
      return {
        apiKey: '',
        apiEndpoint: '',
        isConfigured: true, // COD is always available
      };
    default:
      return {
        apiKey: '',
        apiEndpoint: '',
        isConfigured: false,
      };
  }
}

/** Payment webhook secret for each provider */
export function getWebhookSecret(provider: ProviderCode): string {
  switch (provider) {
    case 'paymob':
      return process.env.PAYMOB_WEBHOOK_SECRET || '';
    case 'fawry':
      return process.env.FAWRY_WEBHOOK_SECRET || '';
    case 'stripe':
      return process.env.STRIPE_WEBHOOK_SECRET || '';
    case 'cod':
      return '';
    default:
      return '';
  }
}

/** Currency for all transactions (EGP) */
export const PAYMENT_CURRENCY = 'EGP';

/** Minimum transaction amount in piastres */
export const MIN_TRANSACTION_AMOUNT = 100; // EGP 1.00

/** Maximum transaction amount in piastres (EGP 100,000) */
export const MAX_TRANSACTION_AMOUNT = 10000000;

/** Payment intent expiry in minutes */
export const INTENT_EXPIRY_MINUTES = 30;

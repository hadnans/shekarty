// GGH Payment — Provider factory/selector
// Selects the appropriate payment provider based on configuration and method

import { SUPPORTED_PROVIDERS, type ProviderCode, DEFAULT_PAYMENT_PROVIDER } from '../config';
import { type PaymentProvider } from '../provider-interface';
import { type PaymentMethodType, type ProviderConfig } from '../types';
import { StripeProvider } from './stripe';
import { PaymobProvider } from './paymob';
import { FawryProvider } from './fawry';
import { CodProvider } from './cod';

// ============================================
// PROVIDER INSTANCES (singleton pattern)
// ============================================

const providerInstances: Map<string, PaymentProvider> = new Map();

function initializeProviders(): void {
  providerInstances.set('stripe', new StripeProvider());
  providerInstances.set('paymob', new PaymobProvider());
  providerInstances.set('fawry', new FawryProvider());
  providerInstances.set('cod', new CodProvider());
}

// Initialize on module load
initializeProviders();

// ============================================
// PROVIDER SELECTION
// ============================================

/**
 * Get a payment provider instance by code.
 * Returns the provider or null if the code is not recognized.
 */
export function getProvider(code: string): PaymentProvider | null {
  return providerInstances.get(code) || null;
}

/**
 * Select a payment provider based on payment method.
 * Maps payment methods to their corresponding provider.
 */
export function selectProvider(method: PaymentMethodType): PaymentProvider {
  const methodToProvider: Record<PaymentMethodType, string> = {
    cod: 'cod',
    card: 'paymob', // Default card processing via Paymob (can be configured to Stripe)
    wallet: 'paymob',
    fawry_card: 'fawry',
    fawry_cash: 'fawry',
    valu: 'paymob', // ValU uses Paymob as gateway
    instapay: 'paymob', // InstaPay via Paymob
  };

  const providerCode = methodToProvider[method] || DEFAULT_PAYMENT_PROVIDER;
  const provider = providerInstances.get(providerCode);

  if (!provider) {
    // Fallback to COD if provider not available
    return providerInstances.get('cod')!;
  }

  return provider;
}

/**
 * Get all available provider configurations.
 * Used for admin UI to show which providers are configured and active.
 */
export function getAllProviderConfigs(): ProviderConfig[] {
  return Array.from(providerInstances.values()).map((provider) => provider.getConfig());
}

/**
 * Get provider codes that support a given payment method.
 */
export function getProvidersForMethod(method: PaymentMethodType): string[] {
  const supported: string[] = [];
  for (const [code, provider] of providerInstances) {
    if (provider.getConfig().supportedMethods.includes(method)) {
      supported.push(code);
    }
  }
  return supported;
}

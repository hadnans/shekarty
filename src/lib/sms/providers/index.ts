// GGH SMS — Provider Factory/Selector
// Selects and instantiates the appropriate SMS provider based on configuration

import { type SmsProvider } from '../provider-interface';
import { type SmsProviderName, getSmsProviderName } from '../config';
import { DevSmsProvider } from './dev';
import { TwilioSmsProvider } from './twilio';
import { MessageBirdSmsProvider } from './messagebird';
import { VonageSmsProvider } from './vonage';

// ============================================
// PROVIDER INSTANCES (lazy singleton pattern)
// ============================================

const providerInstances: Map<SmsProviderName, SmsProvider> = new Map();

/**
 * Get or create an SMS provider instance.
 * Uses lazy initialization — provider is created on first access.
 */
function getProviderInstance(name: SmsProviderName): SmsProvider {
  if (!providerInstances.has(name)) {
    switch (name) {
      case 'dev':
        providerInstances.set(name, new DevSmsProvider());
        break;
      case 'twilio':
        providerInstances.set(name, new TwilioSmsProvider());
        break;
      case 'messagebird':
        providerInstances.set(name, new MessageBirdSmsProvider());
        break;
      case 'vonage':
        providerInstances.set(name, new VonageSmsProvider());
        break;
      default:
        // Fallback to dev provider
        providerInstances.set(name, new DevSmsProvider());
    }
  }

  return providerInstances.get(name)!;
}

/**
 * Get the currently configured SMS provider.
 * Provider is selected based on SMS_PROVIDER env variable.
 * Defaults to 'dev' if not set or invalid.
 */
export function getSmsProvider(): SmsProvider {
  const providerName = getSmsProviderName();
  return getProviderInstance(providerName);
}

/**
 * Get a specific SMS provider by name (for testing or admin override).
 */
export function getSmsProviderByName(name: SmsProviderName): SmsProvider {
  return getProviderInstance(name);
}

/**
 * Get all available provider names.
 */
export function getAvailableProviders(): SmsProviderName[] {
  return ['dev', 'twilio', 'messagebird', 'vonage'];
}

/**
 * Reset provider instances (useful for testing or when config changes).
 */
export function resetProviders(): void {
  providerInstances.clear();
}

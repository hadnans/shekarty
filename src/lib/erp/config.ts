// GGH — ERPNext Integration Configuration
// Validates environment variables, supports "disabled" mode when ERPNext is not configured

import { z } from 'zod';

/** Zod schema for ERPNext environment configuration */
const erpConfigSchema = z.object({
  /** ERPNext server base URL, e.g. https://erp.gomla.com */
  url: z.string().url().optional().default(''),
  /** ERPNext API Key (token-based auth) */
  apiKey: z.string().optional().default(''),
  /** ERPNext API Secret (token-based auth) */
  apiSecret: z.string().optional().default(''),
  /** ERPNext default company name */
  company: z.string().optional().default('GGH Wholesale'),
  /** Maximum retry attempts for failed requests */
  maxRetries: z.coerce.number().int().min(0).max(10).optional().default(3),
  /** Base delay in ms for exponential backoff */
  retryDelayMs: z.coerce.number().int().min(100).optional().default(1000),
  /** Request timeout in ms */
  timeoutMs: z.coerce.number().int().min(1000).optional().default(30000),
  /** Webhook secret for verifying ERPNext webhook signatures */
  webhookSecret: z.string().optional().default(''),
});

/** Validated ERPNext configuration type */
export type ErpConfig = z.infer<typeof erpConfigSchema>;

/** Parsed and validated configuration singleton */
let _config: ErpConfig | null = null;

/**
 * Get the validated ERPNext configuration from environment variables.
 * Caches the result after first call.
 * @returns Validated ERPNext configuration object
 */
export function getErpConfig(): ErpConfig {
  if (_config) return _config;

  const raw = {
    url: process.env.ERP_NEXT_URL ?? '',
    apiKey: process.env.ERP_NEXT_API_KEY ?? '',
    apiSecret: process.env.ERP_NEXT_API_SECRET ?? '',
    company: process.env.ERP_NEXT_COMPANY ?? 'GGH Wholesale',
    maxRetries: process.env.ERP_NEXT_MAX_RETRIES ?? '3',
    retryDelayMs: process.env.ERP_NEXT_RETRY_DELAY_MS ?? '1000',
    timeoutMs: process.env.ERP_NEXT_TIMEOUT_MS ?? '30000',
    webhookSecret: process.env.ERP_NEXT_WEBHOOK_SECRET ?? '',
  };

  const result = erpConfigSchema.safeParse(raw);

  if (!result.success) {
    console.warn('[ERP Config] Invalid configuration:', result.error.flatten().fieldErrors);
    _config = erpConfigSchema.parse({});
    return _config;
  }

  _config = result.data;
  return _config;
}

/**
 * Check if ERPNext is configured and enabled.
 * All three credentials (URL, API Key, API Secret) must be present.
 * @returns true if ERPNext integration is active
 */
export function isErpEnabled(): boolean {
  const config = getErpConfig();
  return config.url !== '' && config.apiKey !== '' && config.apiSecret !== '';
}

/**
 * Reset the cached configuration (useful for testing).
 */
export function resetErpConfig(): void {
  _config = null;
}

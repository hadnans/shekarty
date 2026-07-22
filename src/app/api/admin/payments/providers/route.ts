// GGH Admin Payment Providers — GET provider list, POST configure
// Uses apiHandler, requireAdminAuthOrThrow

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { getAllProviderConfigs, getProvider } from '@/lib/payment/providers';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-payments-providers');

// ============================================
// VALIDATION
// ============================================

const providerConfigSchema = z.object({
  provider: z.enum(['stripe', 'paymob', 'fawry', 'cod']),
  apiKey: z.string().optional(),
  apiEndpoint: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// GET — List all payment providers with status
// ============================================

export const GET = apiHandler(async (_request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const providerConfigs = getAllProviderConfigs();

  logger.info('Payment providers listed', { adminId: admin.id });

  return successResponse(providerConfigs.map((config) => ({
    code: config.code,
    nameEn: config.nameEn,
    nameAr: config.nameAr,
    isActive: config.isActive,
    isConfigured: config.isConfigured,
    supportedMethods: config.supportedMethods,
    apiKey: config.apiKey ? 'configured' : '', // Don't expose actual key
    apiEndpoint: config.apiEndpoint,
  })), 'Payment providers retrieved');
});

// ============================================
// POST — Configure a payment provider
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = providerConfigSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid provider configuration', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;
  const provider = getProvider(data.provider);

  if (!provider) {
    throw new ValidationError(`Payment provider '${data.provider}' not found`, 'PROVIDER_NOT_FOUND');
  }

  // In production, this would update environment variables or a secure config store
  // For now, we log the configuration request and return the updated config
  logger.info('Payment provider configuration requested', {
    adminId: admin.id,
    provider: data.provider,
    hasApiKey: !!data.apiKey,
    isActive: data.isActive,
  });

  const currentConfig = provider.getConfig();

  return successResponse({
    code: currentConfig.code,
    nameEn: currentConfig.nameEn,
    nameAr: currentConfig.nameAr,
    isActive: data.isActive ?? currentConfig.isActive,
    isConfigured: data.apiKey ? true : currentConfig.isConfigured,
    supportedMethods: currentConfig.supportedMethods,
    message: 'Provider configuration updated. In production, this would persist to env/secrets.',
  }, 'Provider configuration updated');
});

// GGH Admin — SMS Provider Configuration
// GET: Current SMS provider configuration
// PATCH: Update SMS provider configuration (stored in AppSetting)

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { SMS_PROVIDERS } from '@/lib/sms/config';
import { getAvailableProviders, resetProviders } from '@/lib/sms/providers';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-settings-sms');

// ============================================
// VALIDATION SCHEMA
// ============================================

const smsConfigSchema = z.object({
  provider: z.enum([...SMS_PROVIDERS] as [string, ...string[]]),
  isActive: z.boolean().default(true),
  fromNumber: z.string().default(''),
  configJson: z.string().default('{}'), // JSON with provider-specific config (keys only, secrets in env)
});

// ============================================
// APP SETTINGS KEYS
// ============================================

/** Get an AppSetting value by key */
async function getSetting(key: string): Promise<string> {
  const setting = await db.appSetting.findUnique({ where: { key } });
  return setting?.value ?? '';
}

/** Set an AppSetting value by key (upsert) */
async function setSetting(key: string, value: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

// ============================================
// GET — Current SMS Configuration
// ============================================

export const GET = apiHandler(async (_request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const provider = await getSetting('sms_provider') || 'dev';
  const isActive = (await getSetting('sms_is_active')) === 'true';
  const fromNumber = await getSetting('sms_from_number');
  const configJson = await getSetting('sms_config_json') || '{}';

  const availableProviders = getAvailableProviders();

  logger.info('Admin retrieved SMS configuration', { adminId: admin.id });

  return successResponse({
    provider,
    isActive,
    fromNumber,
    configJson,
    availableProviders,
    // Show which env vars are set (not the actual values for security)
    envStatus: {
      SMS_PROVIDER: !!process.env.SMS_PROVIDER,
      TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
      TWILIO_FROM_NUMBER: !!process.env.TWILIO_FROM_NUMBER,
      TWILIO_VERIFY_SERVICE_SID: !!process.env.TWILIO_VERIFY_SERVICE_SID,
      MESSAGEBIRD_API_KEY: !!process.env.MESSAGEBIRD_API_KEY,
      MESSAGEBIRD_FROM_NUMBER: !!process.env.MESSAGEBIRD_FROM_NUMBER,
      MESSAGEBIRD_VERIFY_API_KEY: !!process.env.MESSAGEBIRD_VERIFY_API_KEY,
      VONAGE_API_KEY: !!process.env.VONAGE_API_KEY,
      VONAGE_API_SECRET: !!process.env.VONAGE_API_SECRET,
      VONAGE_FROM_NUMBER: !!process.env.VONAGE_FROM_NUMBER,
    },
  });
});

// ============================================
// PATCH — Update SMS Configuration
// ============================================

export const PATCH = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const validated = smsConfigSchema.safeParse(body);

  if (!validated.success) {
    throw new ValidationError(
      'Invalid SMS configuration',
      'INVALID_SMS_CONFIG',
      validated.error.flatten().fieldErrors
    );
  }

  const { provider, isActive, fromNumber, configJson } = validated.data;

  // Store configuration in AppSetting table
  await setSetting('sms_provider', provider);
  await setSetting('sms_is_active', isActive ? 'true' : 'false');
  await setSetting('sms_from_number', fromNumber);
  await setSetting('sms_config_json', configJson);

  // Update env variable for current process (runtime override)
  process.env.SMS_PROVIDER = provider;

  // Reset provider instances so the new provider is loaded on next request
  resetProviders();

  logger.info('Admin updated SMS configuration', {
    adminId: admin.id,
    provider,
    isActive,
  });

  return successResponse({
    provider,
    isActive,
    fromNumber,
    configJson,
    message: 'SMS configuration updated. Provider will be active on next OTP request.',
  });
});

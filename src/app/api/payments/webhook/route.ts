// GGH Payment Webhook — Receive payment webhooks (provider-specific)
// POST receive and process webhook events from payment providers

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { successResponse } from '@/lib/ggh/auth';
import { verifyProviderWebhook, processWebhookEvent, constructWebhookEvent } from '@/lib/payment/webhooks';
import { SUPPORTED_PROVIDERS, type ProviderCode } from '@/lib/payment/config';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('payments-webhook');

// ============================================
// VALIDATION
// ============================================

const webhookSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
});

// ============================================
// POST — Receive and process payment webhook
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  // Extract provider from query parameter
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get('provider');

  if (!providerParam) {
    throw new ValidationError('Provider parameter is required', 'PROVIDER_REQUIRED');
  }

  const parsed = webhookSchema.safeParse({ provider: providerParam });
  if (!parsed.success) {
    throw new ValidationError('Invalid provider', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const provider = parsed.data.provider as ProviderCode;

  // Get raw payload and signature
  const payload = await request.text();
  const signature = request.headers.get('x-signature') || request.headers.get('stripe-signature') || '';

  // Verify webhook signature
  const isValid = verifyProviderWebhook(provider, payload, signature);
  if (!isValid) {
    logger.warn('Webhook signature verification failed', { provider });
    throw new ValidationError('Webhook signature verification failed', 'WEBHOOK_SIGNATURE_INVALID');
  }

  // Construct event from payload
  const headers: Record<string, string> = {};
  request.headers.forEach((value: string, key: string) => {
    headers[key] = value;
  });

  const event = constructWebhookEvent(provider, payload, headers);

  // Process the event
  await processWebhookEvent(event);

  logger.info('Payment webhook processed', {
    provider,
    eventType: event.eventType,
    providerTxId: event.providerTxId,
  });

  return successResponse({ processed: true, provider, eventType: event.eventType }, 'Webhook processed');
});

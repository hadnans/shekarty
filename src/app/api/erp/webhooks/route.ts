// GGH — ERP Webhooks API Route
// POST: receive ERPNext webhook events

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/ggh/auth';
import { verifyWebhookSignature, routeWebhook } from '@/lib/erp/webhook';
import { isErpEnabled } from '@/lib/erp/config';
import type { ErpWebhookEvent } from '@/lib/erp/types';

/**
 * POST /api/erp/webhooks — Receive and process ERPNext webhook events
 * Verifies webhook signature and routes to appropriate handler.
 * No authentication required (ERPNext calls this directly).
 */
export async function POST(request: NextRequest) {
  // Check if ERP is configured
  if (!isErpEnabled()) {
    return errorResponse('ERPNext integration is not configured', 'ERP_NOT_CONFIGURED', 503);
  }

  // Get raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('x-erpnext-webhook-signature') ?? '';

  // Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    return errorResponse('Invalid webhook signature', 'INVALID_SIGNATURE', 401);
  }

  // Parse webhook data
  let webhookData: ErpWebhookEvent;
  try {
    webhookData = JSON.parse(rawBody) as ErpWebhookEvent;
  } catch {
    return errorResponse('Invalid JSON payload', 'INVALID_JSON', 400);
  }

  // Validate required fields
  if (!webhookData.doctype || !webhookData.event) {
    return errorResponse('Missing required fields: doctype, event', 'VALIDATION_ERROR', 400);
  }

  // Route to appropriate handler
  try {
    const handled = await routeWebhook(webhookData);

    if (handled) {
      return successResponse({ processed: true }, 'Webhook processed successfully');
    } else {
      return successResponse({ processed: false }, 'Webhook received but not processed (unhandled DocType or no matching entity)');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Webhook processing failed: ${message}`, 'WEBHOOK_ERROR', 500);
  }
}

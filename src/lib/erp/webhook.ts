// GGH — ERPNext Webhook Handler
// Receives and processes webhook events from ERPNext

import { createHmac } from 'crypto';
import { db } from '@/lib/db';
import { getErpConfig, isErpEnabled } from './config';
import type { ErpWebhookEvent } from './types';

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Verify the signature of an incoming ERPNext webhook.
 * Uses HMAC-SHA256 with the configured webhook secret.
 * @param payload - Raw request body (JSON string)
 * @param signature - Signature from the X-ERPNext-Webhook-Signature header
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const config = getErpConfig();

  if (!config.webhookSecret) {
    // If no secret is configured, skip verification (dev mode)
    console.warn('[ERP Webhook] No webhook secret configured — skipping signature verification');
    return true;
  }

  const expectedSignature = createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (expectedSignature.length !== signature.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expectedSignature.length; i++) {
    mismatch |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return mismatch === 0;
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * Handle stock update webhook from ERPNext.
 * When stock changes in ERP, update the corresponding GGH product stock.
 * @param webhookData - Webhook event data from ERPNext
 * @returns true if processed successfully
 */
export async function handleStockUpdate(webhookData: ErpWebhookEvent): Promise<boolean> {
  if (!isErpEnabled()) return false;

  const data = webhookData.data;

  // Extract stock information from the webhook
  const itemCode = String(data.item_code ?? '');
  const warehouse = String(data.warehouse ?? '');
  const actualQty = Number(data.actual_qty ?? 0);
  const projectedQty = Number(data.projected_qty ?? 0);

  if (!itemCode) {
    console.warn('[ERP Webhook] Stock update missing item_code');
    return false;
  }

  // Find the product by handle or name
  const product = await db.product.findFirst({
    where: {
      OR: [
        { handle: itemCode },
        { nameEn: itemCode },
      ],
    },
  });

  if (!product) {
    console.warn(`[ERP Webhook] Product not found for item_code: ${itemCode}`);
    return false;
  }

  // Update stock in GGH database
  await db.product.update({
    where: { id: product.id },
    data: {
      stock: actualQty,
      updatedAt: new Date(),
    },
  });

  // Log the sync
  await db.erpSyncLog.create({
    data: {
      entityType: 'stock',
      entityId: product.id,
      action: 'update',
      erpDocType: 'Bin',
      erpDocName: `${itemCode}-${warehouse}`,
      status: 'success',
      request: JSON.stringify(webhookData),
      response: JSON.stringify({ stock: actualQty, projected: projectedQty }),
      syncedAt: new Date(),
    },
  });

  return true;
}

/**
 * Handle order status update webhook from ERPNext.
 * When order status changes in ERP, update the corresponding GGH order.
 * @param webhookData - Webhook event data from ERPNext
 * @returns true if processed successfully
 */
export async function handleOrderStatusUpdate(webhookData: ErpWebhookEvent): Promise<boolean> {
  if (!isErpEnabled()) return false;

  const data = webhookData.data;

  // Extract order information
  const erpOrderName = String(data.name ?? webhookData.name ?? '');
  const erpStatus = String(data.status ?? '');
  const gghOrderId = String(data.ggh_order_id ?? '');

  if (!gghOrderId && !erpOrderName) {
    console.warn('[ERP Webhook] Order update missing both ggh_order_id and ERP name');
    return false;
  }

  // Find the GGH order
  let order;
  if (gghOrderId) {
    order = await db.order.findUnique({ where: { id: gghOrderId } });
  }
  if (!order && erpOrderName) {
    order = await db.order.findFirst({
      where: { erpSalesOrder: erpOrderName },
    });
  }

  if (!order) {
    console.warn(`[ERP Webhook] Order not found for ggh_order_id: ${gghOrderId}, erpName: ${erpOrderName}`);
    return false;
  }

  // Map ERPNext status to GGH status
  const statusMap: Record<string, string> = {
    'Draft': 'pending',
    'Open': 'confirmed',
    'To Deliver and Bill': 'processing',
    'To Deliver': 'packed',
    'To Bill': 'delivered',
    'Completed': 'delivered',
    'Cancelled': 'cancelled',
    'Closed': 'cancelled',
  };

  const gghStatus = statusMap[erpStatus] ?? order.status;

  if (gghStatus !== order.status) {
    // Update order status
    await db.order.update({
      where: { id: order.id },
      data: {
        status: gghStatus,
        erpSyncStatus: 'synced',
        erpSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Add status history entry
    await db.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: gghStatus,
        note: `Updated from ERPNext (status: ${erpStatus})`,
        changedBy: 'erp_sync',
      },
    });
  }

  // Log the sync
  await db.erpSyncLog.create({
    data: {
      entityType: 'order',
      entityId: order.id,
      action: 'update',
      erpDocType: 'Sales Order',
      erpDocName: erpOrderName,
      status: 'success',
      request: JSON.stringify(webhookData),
      response: JSON.stringify({ gghStatus, erpStatus }),
      syncedAt: new Date(),
    },
  });

  return true;
}

/**
 * Handle payment update webhook from ERPNext.
 * When a payment is recorded in ERP, update the corresponding GGH order payment status.
 * @param webhookData - Webhook event data from ERPNext
 * @returns true if processed successfully
 */
export async function handlePaymentUpdate(webhookData: ErpWebhookEvent): Promise<boolean> {
  if (!isErpEnabled()) return false;

  const data = webhookData.data;

  // Extract payment information
  const paymentName = String(data.name ?? webhookData.name ?? '');
  const party = String(data.party ?? '');
  const paidAmount = Number(data.paid_amount ?? 0);
  const referenceDoctype = String(data.reference_doctype ?? '');
  const referenceName = String(data.reference_name ?? '');
  const gghOrderId = String(data.ggh_order_id ?? '');

  // Find the related order
  let order;
  if (gghOrderId) {
    order = await db.order.findUnique({ where: { id: gghOrderId } });
  }
  if (!order && referenceDoctype === 'Sales Order' && referenceName) {
    order = await db.order.findFirst({
      where: { erpSalesOrder: referenceName },
    });
  }
  if (!order && party) {
    // Try to find by customer
    order = await db.order.findFirst({
      where: { customerId: party },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!order) {
    console.warn(`[ERP Webhook] Payment update: order not found for payment ${paymentName}`);
    return false;
  }

  // Update payment status based on payment
  const paymentStatusMap: Record<string, string> = {
    'Submitted': 'paid',
    'Paid': 'paid',
    'Cancelled': 'failed',
    'Returned': 'refunded',
  };

  const erpPaymentStatus = String(data.status ?? '');
  const gghPaymentStatus = paymentStatusMap[erpPaymentStatus] ?? 'paid';

  await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: gghPaymentStatus,
      erpSyncStatus: 'synced',
      erpSyncedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Log the sync
  await db.erpSyncLog.create({
    data: {
      entityType: 'order',
      entityId: order.id,
      action: 'update',
      erpDocType: 'Payment Entry',
      erpDocName: paymentName,
      status: 'success',
      request: JSON.stringify(webhookData),
      response: JSON.stringify({ paymentStatus: gghPaymentStatus, paidAmount }),
      syncedAt: new Date(),
    },
  });

  return true;
}

/**
 * Route an incoming webhook to the appropriate handler based on DocType.
 * @param webhookData - Webhook event data from ERPNext
 * @returns true if processed successfully, false otherwise
 */
export async function routeWebhook(webhookData: ErpWebhookEvent): Promise<boolean> {
  const doctype = webhookData.doctype.toLowerCase();

  switch (doctype) {
    case 'bin':
    case 'stock ledger entry':
      return handleStockUpdate(webhookData);

    case 'sales order':
      return handleOrderStatusUpdate(webhookData);

    case 'payment entry':
      return handlePaymentUpdate(webhookData);

    default:
      console.warn(`[ERP Webhook] Unhandled DocType: ${webhookData.doctype}`);
      return false;
  }
}

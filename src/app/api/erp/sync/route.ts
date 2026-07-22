// GGH — ERP Sync API Route
// POST: trigger manual sync of orders/stock

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { syncAllPendingOrders, syncStockFromErp, syncOrderToErp, syncCustomerToErp } from '@/lib/erp/sync';
import { isErpEnabled } from '@/lib/erp/config';
import { z } from 'zod';

/** Request body schema for sync trigger */
const syncRequestSchema = z.object({
  /** Type of sync to perform */
  type: z.enum(['orders', 'stock', 'customer', 'all']).default('all'),
  /** Specific order ID to sync (when type is 'orders') */
  orderId: z.string().optional(),
  /** Specific customer ID to sync (when type is 'customer') */
  customerId: z.string().optional(),
});

/**
 * POST /api/erp/sync — Trigger manual sync of orders/stock/customers
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  // Check if ERP is configured
  if (!isErpEnabled()) {
    return successResponse({
      enabled: false,
      message: 'ERPNext is not configured. Set ERP_NEXT_URL, ERP_NEXT_API_KEY, and ERP_NEXT_API_SECRET environment variables.',
    });
  }

  // Parse request body
  let body: z.infer<typeof syncRequestSchema>;
  try {
    const raw = await request.json();
    body = syncRequestSchema.parse(raw);
  } catch {
    return errorResponse('Invalid request body. Expected: { type: "orders" | "stock" | "customer" | "all" }', 'VALIDATION_ERROR', 400);
  }

  const results: Record<string, unknown> = {};

  try {
    if ((body.type === 'orders' || body.type === 'all') && body.orderId) {
      // Sync a specific order
      const result = await syncOrderToErp(body.orderId);
      results.order = result;
    } else if (body.type === 'orders' || body.type === 'all') {
      // Sync all pending orders
      const result = await syncAllPendingOrders();
      results.orders = result;
    }

    if (body.type === 'stock' || body.type === 'all') {
      const result = await syncStockFromErp();
      results.stock = { updated: result, message: result !== null ? `${result} products updated` : 'ERP disabled' };
    }

    if ((body.type === 'customer' || body.type === 'all') && body.customerId) {
      const result = await syncCustomerToErp(body.customerId);
      results.customer = result;
    }

    return successResponse(results, 'Sync completed');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Sync failed: ${message}`, 'SYNC_ERROR', 500);
  }
}

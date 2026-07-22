// GGH — ERP Sales Orders API Route
// GET: list synced sales orders

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { getSalesOrders } from '@/lib/erp/modules/sales-order';
import { isErpEnabled } from '@/lib/erp/config';

/**
 * GET /api/erp/sales-orders — List synced Sales Orders from ERPNext
 * Query params: customer?, status?, fromDate?, toDate?, gghOrderId?, limit?
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  if (!isErpEnabled()) {
    return successResponse({
      enabled: false,
      salesOrders: [],
      message: 'ERPNext is not configured',
    });
  }

  const { searchParams } = new URL(request.url);
  const customer = searchParams.get('customer') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const fromDate = searchParams.get('fromDate') ?? undefined;
  const toDate = searchParams.get('toDate') ?? undefined;
  const gghOrderId = searchParams.get('gghOrderId') ?? undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') ?? '20', 10) : 20;

  try {
    const salesOrders = await getSalesOrders({
      customer,
      status,
      fromDate,
      toDate,
      gghOrderId,
      limit,
    });
    return successResponse({ enabled: true, salesOrders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to list sales orders: ${message}`, 'ERP_ERROR', 500);
  }
}

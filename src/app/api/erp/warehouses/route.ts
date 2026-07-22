// GGH — ERP Warehouses API Route
// GET: list warehouses

import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { listWarehouses } from '@/lib/erp/modules/warehouse';
import { isErpEnabled } from '@/lib/erp/config';

/**
 * GET /api/erp/warehouses — List all warehouses from ERPNext
 * Requires authentication.
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  if (!isErpEnabled()) {
    return successResponse({
      enabled: false,
      warehouses: [],
      message: 'ERPNext is not configured',
    });
  }

  try {
    const warehouses = await listWarehouses();
    return successResponse({ enabled: true, warehouses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to list warehouses: ${message}`, 'ERP_ERROR', 500);
  }
}

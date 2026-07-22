// GGH — ERP Sync Status API Route
// GET: check sync status

import { successResponse, requireAuth } from '@/lib/ggh/auth';
import { getSyncStatus } from '@/lib/erp/sync';

/**
 * GET /api/erp/sync/status — Check the current ERP sync status
 * Returns whether ERP is enabled, last sync time, and pending/failed counts.
 * Requires authentication.
 */
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  const status = await getSyncStatus();

  return successResponse(status);
}

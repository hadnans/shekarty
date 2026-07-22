// GET /api/delivery/dispatcher/dashboard — Dispatcher overview data

import { getDispatcherOverview, getPendingAssignments, getActiveDeliveries, getRecentCompletions } from '@/lib/delivery/dispatcher';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function GET() {
  try {
    const [overview, pending, active, recent] = await Promise.all([
      getDispatcherOverview(),
      getPendingAssignments(),
      getActiveDeliveries(),
      getRecentCompletions(),
    ]);

    return successResponse({
      overview,
      pendingAssignments: pending,
      activeDeliveries: active,
      recentCompletions: recent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dispatcher dashboard';
    return errorResponse(message, 'DASHBOARD_ERROR', 500);
  }
}

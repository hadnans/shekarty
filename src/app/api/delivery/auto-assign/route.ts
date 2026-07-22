// POST /api/delivery/auto-assign — Auto-assign best driver (requires auth)

import { NextRequest } from 'next/server';
import { autoAssignDriver } from '@/lib/delivery/assignment';
import { requireAuth, successResponse, errorResponse } from '@/lib/ggh/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ('status' in auth) return auth;

    const body = await request.json();
    const { orderId } = body as { orderId: string };

    if (!orderId) {
      return errorResponse('orderId is required', 'VALIDATION_ERROR', 400);
    }

    const result = await autoAssignDriver(orderId);
    return successResponse(result, 'Driver auto-assigned successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to auto-assign driver';
    return errorResponse(message, 'AUTO_ASSIGN_ERROR', 400);
  }
}

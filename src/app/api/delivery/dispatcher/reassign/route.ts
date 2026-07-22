// POST /api/delivery/dispatcher/reassign — Reassign driver to an order

import { NextRequest } from 'next/server';
import { reassignDriver } from '@/lib/delivery/assignment';
import { requireAuth, successResponse, errorResponse } from '@/lib/ggh/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ('status' in auth) return auth;

    const body = await request.json();
    const { orderId, newDriverId, reason } = body as { orderId: string; newDriverId: string; reason: string };

    if (!orderId || !newDriverId || !reason) {
      return errorResponse('orderId, newDriverId, and reason are required', 'VALIDATION_ERROR', 400);
    }

    const result = await reassignDriver(orderId, newDriverId, reason);
    return successResponse(result, 'Driver reassigned successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reassign driver';
    return errorResponse(message, 'REASSIGN_ERROR', 400);
  }
}

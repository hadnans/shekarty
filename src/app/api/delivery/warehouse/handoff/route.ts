// POST /api/delivery/warehouse/handoff — Hand off order to driver

import { NextRequest } from 'next/server';
import { handoffToDriver } from '@/lib/delivery/warehouse-ops';
import { requireAuth, successResponse, errorResponse } from '@/lib/ggh/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ('status' in auth) return auth;

    const body = await request.json();
    const { orderId, driverId } = body as { orderId: string; driverId: string };

    if (!orderId || !driverId) {
      return errorResponse('orderId and driverId are required', 'VALIDATION_ERROR', 400);
    }

    const result = await handoffToDriver(orderId, driverId);
    return successResponse(result, result.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to hand off order';
    return errorResponse(message, 'HANDOFF_ERROR', 400);
  }
}

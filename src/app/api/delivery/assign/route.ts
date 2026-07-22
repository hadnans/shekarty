// POST /api/delivery/assign — Manual driver assignment (requires auth)

import { NextRequest } from 'next/server';
import { assignDriver } from '@/lib/delivery/assignment';
import { requireAuth, successResponse, errorResponse } from '@/lib/ggh/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ('status' in auth) return auth; // Unauthorized response

    const body = await request.json();
    const { orderId, driverId } = body as { orderId: string; driverId: string };

    if (!orderId || !driverId) {
      return errorResponse('orderId and driverId are required', 'VALIDATION_ERROR', 400);
    }

    const result = await assignDriver(orderId, driverId);
    return successResponse(result, 'Driver assigned successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to assign driver';
    return errorResponse(message, 'ASSIGNMENT_ERROR', 400);
  }
}

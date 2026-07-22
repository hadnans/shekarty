// POST /api/delivery/warehouse/ready — Mark order as packed and ready for pickup

import { NextRequest } from 'next/server';
import { markAsPacked } from '@/lib/delivery/warehouse-ops';
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

    const result = await markAsPacked(orderId);
    return successResponse(result, result.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark order as packed';
    return errorResponse(message, 'PACK_ERROR', 400);
  }
}

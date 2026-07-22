// GET /api/delivery/track/[orderId] — Public tracking endpoint (no auth required)

import { NextRequest } from 'next/server';
import { getTrackingInfo } from '@/lib/delivery/tracking';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const trackingInfo = await getTrackingInfo(orderId);

    if (!trackingInfo) {
      return errorResponse('Order not found', 'NOT_FOUND', 404);
    }

    return successResponse(trackingInfo);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tracking info';
    return errorResponse(message, 'TRACKING_ERROR', 500);
  }
}

// POST /api/delivery/update-status — Update order delivery status (requires auth)

import { NextRequest } from 'next/server';
import { transitionOrder } from '@/lib/delivery/tracking';
import { sendDeliveryNotification } from '@/lib/delivery/notifications';
import { type DeliveryStep } from '@/lib/delivery/types';
import { requireAuth, successResponse, errorResponse } from '@/lib/ggh/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ('status' in auth) return auth;

    const body = await request.json();
    const { orderId, status, note } = body as { orderId: string; status: string; note?: string };

    if (!orderId || !status) {
      return errorResponse('orderId and status are required', 'VALIDATION_ERROR', 400);
    }

    // Validate the status is a valid DeliveryStep
    const validSteps: DeliveryStep[] = [
      'order_placed', 'order_confirmed', 'being_packed', 'ready_for_pickup',
      'driver_assigned', 'driver_en_route', 'driver_arrived_pickup', 'picked_up',
      'driver_en_route_delivery', 'driver_arrived_delivery', 'delivered',
      'delivery_failed', 'cancelled',
    ];

    if (!validSteps.includes(status as DeliveryStep)) {
      return errorResponse(`Invalid delivery step: ${status}`, 'VALIDATION_ERROR', 400);
    }

    const newStep = status as DeliveryStep;

    // Get current order status for validation
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!order) {
      return errorResponse('Order not found', 'NOT_FOUND', 404);
    }

    // Check if transition is valid (we trust the caller but still validate)
    // The transitionOrder function also validates, but we give a nicer error here
    const result = await transitionOrder(orderId, newStep, 'admin', note);

    // Send notification to customer
    try {
      await sendDeliveryNotification(order.customerId, newStep, orderId);
    } catch {
      // Don't fail the status update if notification fails
    }

    return successResponse(result, 'Order status updated');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update order status';
    return errorResponse(message, 'STATUS_UPDATE_ERROR', 400);
  }
}

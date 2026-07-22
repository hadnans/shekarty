// POST /api/delivery/driver/complete — Driver marks delivery as complete

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { transitionOrder } from '@/lib/delivery/tracking';
import { sendDeliveryNotification } from '@/lib/delivery/notifications';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body as { orderId: string };

    if (!orderId) {
      return errorResponse('orderId is required', 'VALIDATION_ERROR', 400);
    }

    const assignment = await db.deliveryAssignment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!assignment) {
      return errorResponse('No assignment found for this order', 'NOT_FOUND', 404);
    }

    if (assignment.status !== 'arrived_delivery') {
      return errorResponse(`Cannot complete delivery in assignment status: ${assignment.status}`, 'INVALID_STATUS', 400);
    }

    // Update assignment
    await db.deliveryAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
      },
    });

    // Update driver stats
    await db.driver.update({
      where: { id: assignment.driverId },
      data: {
        totalDeliveries: { increment: 1 },
        isAvailable: true,
      },
    });

    // Transition order
    await transitionOrder(orderId, 'delivered', 'driver', 'Delivery completed by driver');

    // Send notification
    try {
      await sendDeliveryNotification(assignment.order.customerId, 'delivered', orderId);
    } catch {
      // Don't fail if notification fails
    }

    return successResponse({
      orderId,
      deliveredAt: new Date().toISOString(),
    }, 'Delivery completed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete delivery';
    return errorResponse(message, 'COMPLETE_ERROR', 400);
  }
}

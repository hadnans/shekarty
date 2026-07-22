// POST /api/delivery/driver/accept — Driver accepts an assignment

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { transitionOrder } from '@/lib/delivery/tracking';
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
    });

    if (!assignment) {
      return errorResponse('No assignment found for this order', 'NOT_FOUND', 404);
    }

    if (assignment.status !== 'assigned') {
      return errorResponse(`Assignment cannot be accepted in status: ${assignment.status}`, 'INVALID_STATUS', 400);
    }

    // Update assignment status
    await db.deliveryAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Transition order to driver_en_route
    await transitionOrder(orderId, 'driver_en_route', 'driver', 'Driver accepted assignment');

    return successResponse({ orderId, status: 'accepted' }, 'Assignment accepted');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to accept assignment';
    return errorResponse(message, 'ACCEPT_ERROR', 400);
  }
}

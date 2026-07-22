// POST /api/delivery/driver/arrived — Driver arrived at pickup or delivery location

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { transitionOrder } from '@/lib/delivery/tracking';
import { type DeliveryStep } from '@/lib/delivery/types';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, location } = body as { orderId: string; location: 'pickup' | 'delivery' };

    if (!orderId || !location) {
      return errorResponse('orderId and location (pickup/delivery) are required', 'VALIDATION_ERROR', 400);
    }

    const assignment = await db.deliveryAssignment.findUnique({
      where: { orderId },
    });

    if (!assignment) {
      return errorResponse('No assignment found for this order', 'NOT_FOUND', 404);
    }

    let targetStep: DeliveryStep;
    let targetAssignmentStatus: string;

    if (location === 'pickup') {
      if (assignment.status !== 'accepted') {
        return errorResponse(`Cannot arrive at pickup in assignment status: ${assignment.status}`, 'INVALID_STATUS', 400);
      }
      targetStep = 'driver_arrived_pickup';
      targetAssignmentStatus = 'arrived_pickup';
    } else {
      if (assignment.status !== 'picked_up') {
        return errorResponse(`Cannot arrive at delivery in assignment status: ${assignment.status}`, 'INVALID_STATUS', 400);
      }
      targetStep = 'driver_arrived_delivery';
      targetAssignmentStatus = 'arrived_delivery';
    }

    // Update assignment
    await db.deliveryAssignment.update({
      where: { id: assignment.id },
      data: { status: targetAssignmentStatus },
    });

    // Transition order
    await transitionOrder(orderId, targetStep, 'driver', `Driver arrived at ${location}`);

    return successResponse({
      orderId,
      step: targetStep,
      assignmentStatus: targetAssignmentStatus,
    }, `Driver arrived at ${location}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record arrival';
    return errorResponse(message, 'ARRIVAL_ERROR', 400);
  }
}

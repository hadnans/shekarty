// GET /api/delivery/driver/active-orders — Get driver's active deliveries

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return errorResponse('driverId is required', 'VALIDATION_ERROR', 400);
    }

    const assignments = await db.deliveryAssignment.findMany({
      where: {
        driverId,
        status: { in: ['assigned', 'accepted', 'arrived_pickup', 'picked_up', 'arrived_delivery'] },
      },
      include: {
        order: {
          include: {
            items: true,
            customer: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const activeOrders = assignments.map((a) => ({
      assignmentId: a.id,
      assignmentStatus: a.status,
      assignedAt: a.assignedAt,
      acceptedAt: a.acceptedAt,
      pickedUpAt: a.pickedUpAt,
      order: {
        id: a.order.id,
        orderNumber: a.order.orderNumber,
        status: a.order.status,
        totalAmount: a.order.totalAmount,
        deliverySlot: a.order.deliverySlot,
        deliveryDate: a.order.deliveryDate,
        deliveryAddress: a.order.deliveryAddressSnapshot,
        notes: a.order.notes,
        itemCount: a.order.items.length,
        customer: a.order.customer,
      },
    }));

    return successResponse(activeOrders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch active orders';
    return errorResponse(message, 'FETCH_ERROR', 500);
  }
}

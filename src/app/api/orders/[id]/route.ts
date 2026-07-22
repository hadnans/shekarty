// GGH Orders — Single order with items and status history

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const { id } = await params;

    const order = await db.order.findFirst({
      where: { id, customerId: customer.id, deletedAt: null },
      include: {
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return errorResponse('Order not found', 'ORDER_NOT_FOUND', 404);
    }

    return successResponse(order);
  } catch (err) {
    console.error('Order fetch error:', err);
    return errorResponse('Failed to fetch order', 'ORDER_FETCH_FAILED', 500);
  }
}

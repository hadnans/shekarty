// GGH Orders — Cancel an order

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

export async function POST(
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
      include: { items: true },
    });

    if (!order) {
      return errorResponse('Order not found', 'ORDER_NOT_FOUND', 404);
    }

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return errorResponse(
        `Cannot cancel order in "${order.status}" status. Only pending or confirmed orders can be cancelled.`,
        'ORDER_NOT_CANCELLABLE'
      );
    }

    const updatedOrder = await db.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: {
          status: 'cancelled',
          paymentStatus: order.paymentMethod === 'cod' ? 'pending' : 'refunded',
        },
        include: {
          items: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'cancelled',
          note: 'Order cancelled by customer',
          changedBy: 'customer',
        },
      });

      // Restore product stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            totalSold: { decrement: item.quantity },
          },
        });
      }

      return updated;
    });

    return successResponse(updatedOrder, 'Order cancelled successfully');
  } catch (err) {
    console.error('Order cancel error:', err);
    return errorResponse('Failed to cancel order', 'ORDER_CANCEL_FAILED', 500);
  }
}

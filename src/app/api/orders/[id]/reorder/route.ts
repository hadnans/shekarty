// GGH Orders — Reorder (add all items from an order back to cart)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

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

    let addedCount = 0;
    let skippedCount = 0;

    for (const item of order.items) {
      // Check if product still exists and is active
      const product = await db.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.isActive || product.deletedAt) {
        skippedCount++;
        continue;
      }

      // Upsert cart item
      await db.cartItem.upsert({
        where: {
          customerId_productId: {
            customerId: customer.id,
            productId: item.productId,
          },
        },
        update: {
          quantity: { increment: item.quantity },
          unitPrice: product.todayPrice,
        },
        create: {
          customerId: customer.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.todayPrice,
        },
      });

      addedCount++;
    }

    const message = skippedCount > 0
      ? `${addedCount} items added to cart, ${skippedCount} items no longer available`
      : `${addedCount} items added to cart`;

    return successResponse({ message, addedCount, skippedCount }, message);
  } catch (err) {
    console.error('Reorder error:', err);
    return errorResponse('Failed to reorder', 'REORDER_FAILED', 500);
  }
}

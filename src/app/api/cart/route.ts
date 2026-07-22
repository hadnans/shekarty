// GGH Cart — Get cart items for authenticated user

import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;

    const cartItems = await db.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                slug: true,
                nameEn: true,
                nameAr: true,
                icon: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    let subtotal = 0;
    const items = cartItems.map((item) => {
      subtotal += item.unitPrice * item.quantity;
      return {
        id: item.id,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    return successResponse({
      items,
      subtotal,
      deliveryFee: 0, // Will be calculated at checkout based on zone
      discountAmount: 0,
      totalAmount: subtotal,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (err) {
    console.error('Cart fetch error:', err);
    return errorResponse('Failed to fetch cart', 'CART_FETCH_FAILED', 500);
  }
}

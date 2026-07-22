// GGH Cart — Update quantity (PATCH) or Remove item (DELETE)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const { id } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return errorResponse('Quantity must be a positive integer', 'INVALID_QUANTITY');
    }

    // Find the cart item
    const cartItem = await db.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem || cartItem.customerId !== customer.id) {
      return errorResponse('Cart item not found', 'CART_ITEM_NOT_FOUND', 404);
    }

    // Check product stock
    const product = await db.product.findUnique({
      where: { id: cartItem.productId },
    });

    if (product && product.stock < quantity) {
      return errorResponse('Insufficient stock', 'INSUFFICIENT_STOCK');
    }

    // Update quantity
    const updated = await db.cartItem.update({
      where: { id },
      data: {
        quantity,
        unitPrice: product?.todayPrice ?? cartItem.unitPrice,
      },
      include: { product: true },
    });

    return successResponse(updated, 'Cart item updated');
  } catch (err) {
    console.error('Cart update error:', err);
    return errorResponse('Failed to update cart item', 'CART_UPDATE_FAILED', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const { id } = await params;

    // Find the cart item
    const cartItem = await db.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem || cartItem.customerId !== customer.id) {
      return errorResponse('Cart item not found', 'CART_ITEM_NOT_FOUND', 404);
    }

    await db.cartItem.delete({
      where: { id },
    });

    return successResponse({ message: 'Item removed from cart' });
  } catch (err) {
    console.error('Cart remove error:', err);
    return errorResponse('Failed to remove cart item', 'CART_REMOVE_FAILED', 500);
  }
}

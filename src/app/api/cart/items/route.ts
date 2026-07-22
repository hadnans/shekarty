// GGH Cart — Add item to cart

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const body = await request.json();
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return errorResponse('Product ID is required', 'MISSING_PRODUCT_ID');
    }

    if (quantity < 1 || !Number.isInteger(quantity)) {
      return errorResponse('Quantity must be a positive integer', 'INVALID_QUANTITY');
    }

    // Verify product exists and is active
    const product = await db.product.findUnique({
      where: { id: productId, isActive: true, deletedAt: null },
    });

    if (!product) {
      return errorResponse('Product not found', 'PRODUCT_NOT_FOUND', 404);
    }

    // Check stock
    if (product.stock < quantity) {
      return errorResponse('Insufficient stock', 'INSUFFICIENT_STOCK');
    }

    // Check max per order
    if (quantity > product.maxPerOrder) {
      return errorResponse(`Maximum ${product.maxPerOrder} per order`, 'MAX_QUANTITY_EXCEEDED');
    }

    // Check min order quantity
    if (quantity < product.minOrderQty) {
      return errorResponse(`Minimum order quantity is ${product.minOrderQty}`, 'MIN_QUANTITY_NOT_MET');
    }

    // Upsert cart item
    const cartItem = await db.cartItem.upsert({
      where: {
        customerId_productId: {
          customerId: customer.id,
          productId,
        },
      },
      update: {
        quantity: { increment: quantity },
        unitPrice: product.todayPrice,
      },
      create: {
        customerId: customer.id,
        productId,
        quantity,
        unitPrice: product.todayPrice,
      },
      include: {
        product: true,
      },
    });

    return successResponse(cartItem, 'Item added to cart');
  } catch (err) {
    console.error('Cart add error:', err);
    return errorResponse('Failed to add item to cart', 'CART_ADD_FAILED', 500);
  }
}

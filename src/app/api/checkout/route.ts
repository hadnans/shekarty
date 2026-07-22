// GGH Checkout — Create order from cart items
// With Zod validation, structured error handling, and logging

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';
import { apiHandler, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { checkoutSchema } from '@/lib/validation';
import { createLogger } from '@/lib/logger';

const logger = createLogger('checkout');

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `GGH-${dateStr}-${random}`;
}

export const POST = apiHandler(async (request: NextRequest) => {
  const timer = logger.timer();

  // Auth check
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const customer = authResult;

  // Validate request body with Zod
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid checkout data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const { addressId, deliverySlot, deliveryDate, paymentMethod, notes } = parsed.data;

  logger.info('Checkout started', {
    customerId: customer.id,
    addressId,
    paymentMethod,
  });

  // Verify address belongs to customer
  const address = await db.address.findFirst({
    where: { id: addressId, customerId: customer.id, deletedAt: null },
  });

  if (!address) {
    throw new NotFoundError('Address not found', 'ADDRESS_NOT_FOUND');
  }

  // Get cart items
  const cartItems = await db.cartItem.findMany({
    where: { customerId: customer.id },
    include: { product: true },
  });

  if (cartItems.length === 0) {
    throw new ValidationError('Cart is empty', 'CART_EMPTY');
  }

  // Validate all products are in stock
  for (const item of cartItems) {
    if (!item.product.isActive || item.product.deletedAt) {
      throw new ConflictError(
        `Product "${item.product.nameEn}" is no longer available`,
        'PRODUCT_UNAVAILABLE'
      );
    }
    if (item.product.stock < item.quantity) {
      throw new ConflictError(
        `Insufficient stock for "${item.product.nameEn}". Available: ${item.product.stock}`,
        'INSUFFICIENT_STOCK'
      );
    }
  }

  // Calculate subtotal
  let subtotal = 0;
  const orderItemsData = cartItems.map((item) => {
    const totalPrice = item.unitPrice * item.quantity;
    subtotal += totalPrice;
    return {
      productId: item.productId,
      productNameEn: item.product.nameEn,
      productNameAr: item.product.nameAr,
      brandEn: item.product.brandEn,
      brandAr: item.product.brandAr,
      weight: item.product.weight,
      icon: item.product.icon,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice,
    };
  });

  // Calculate delivery fee based on zone
  let deliveryFee = 0;
  const deliveryZone = await db.deliveryZone.findFirst({
    where: { area: address.area, isActive: true },
  });

  if (deliveryZone) {
    deliveryFee = deliveryZone.deliveryFee;
    // Free delivery above minimum order threshold
    if (deliveryZone.minOrder > 0 && subtotal >= deliveryZone.minOrder) {
      deliveryFee = 0;
    }
  }

  const discountAmount = 0;
  const totalAmount = subtotal + deliveryFee - discountAmount;

  // Create address snapshot
  const addressSnapshot = JSON.stringify({
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.city,
    area: address.area,
    buildingNo: address.buildingNo,
    floorNo: address.floorNo,
    apartmentNo: address.apartmentNo,
    landmark: address.landmark,
    deliveryZone: address.deliveryZone,
  });

  // Generate unique order number
  let orderNumber = generateOrderNumber();
  let existingOrder = await db.order.findUnique({ where: { orderNumber } });
  while (existingOrder) {
    orderNumber = generateOrderNumber();
    existingOrder = await db.order.findUnique({ where: { orderNumber } });
  }

  // Create order with items and status history in a transaction
  const order = await db.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: 'pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
        subtotal,
        deliveryFee,
        discountAmount,
        totalAmount,
        notes: notes ?? '',
        deliveryAddressId: addressId,
        deliveryAddressSnapshot: addressSnapshot,
        deliverySlot,
        deliveryDate: new Date(deliveryDate),
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: {
            status: 'pending',
            note: 'Order placed successfully',
            changedBy: 'customer',
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    });

    // Update product stock
    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          totalSold: { increment: item.quantity },
        },
      });
    }

    // Clear cart
    await tx.cartItem.deleteMany({
      where: { customerId: customer.id },
    });

    return newOrder;
  });

  timer.end('Checkout completed');

  logger.info('Order created successfully', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: customer.id,
    totalAmount,
    itemCount: cartItems.length,
  });

  return successResponse(order, 'Order placed successfully');
});

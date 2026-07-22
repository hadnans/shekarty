// GGH Warehouse Operations — Packing, ready-for-pickup, and driver handoff
// Manages the warehouse side of the delivery pipeline

import { db } from '@/lib/db';
import { transitionOrder } from './tracking';

/**
 * Get orders that are awaiting packing at a warehouse.
 *
 * @param warehouseId - Optional warehouse ID to filter by
 * @returns Array of orders awaiting packing
 */
export async function getPendingPackingOrders(warehouseId?: string): Promise<Array<{
  id: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  deliverySlot: string;
  deliveryDate: Date | null;
  totalAmount: number;
  itemCount: number;
  customerName: string;
  area: string;
}>> {
  const where: Record<string, unknown> = {
    status: { in: ['confirmed', 'processing'] },
    deletedAt: null,
  };

  // If warehouse is specified, filter by delivery area
  if (warehouseId) {
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    if (warehouse) {
      where.deliveryAddressSnapshot = { contains: warehouse.area };
    }
  }

  const orders = await db.order.findMany({
    where,
    include: {
      customer: { select: { firstName: true, lastName: true } },
      items: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return orders.map((order) => {
    const addressData = parseDeliveryAddress(order.deliveryAddressSnapshot);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      deliverySlot: order.deliverySlot,
      deliveryDate: order.deliveryDate,
      totalAmount: order.totalAmount,
      itemCount: order.items.length,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim() || 'Unknown',
      area: addressData?.area || '',
    };
  });
}

/**
 * Mark an order as packed and ready for driver pickup.
 * Transitions order through being_packed → ready_for_pickup.
 *
 * @param orderId - The order ID to mark as packed
 * @returns Success status and order number
 */
export async function markAsPacked(orderId: string): Promise<{
  success: boolean;
  orderNumber: string;
  message: string;
}> {
  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (!['confirmed', 'processing', 'pending'].includes(order.status)) {
    throw new Error(`Order ${orderId} cannot be packed in status: ${order.status}`);
  }

  // Transition through steps to ready_for_pickup
  if (order.status === 'pending') {
    await transitionOrder(orderId, 'order_confirmed', 'warehouse', 'Order confirmed for packing');
  }

  if (order.status === 'pending' || order.status === 'confirmed') {
    await transitionOrder(orderId, 'being_packed', 'warehouse', 'Order is being packed');
  }

  await transitionOrder(orderId, 'ready_for_pickup', 'warehouse', 'Order packed and ready for pickup');

  return {
    success: true,
    orderNumber: order.orderNumber,
    message: `Order ${order.orderNumber} has been packed and is ready for pickup`,
  };
}

/**
 * Hand off a packed order to a driver at the warehouse.
 * Updates the assignment and transitions the order state.
 *
 * @param orderId - The order ID to hand off
 * @param driverId - The driver ID receiving the order
 * @returns Success status with handoff details
 */
export async function handoffToDriver(orderId: string, driverId: string): Promise<{
  success: boolean;
  orderNumber: string;
  driverName: string;
  message: string;
}> {
  // Validate assignment exists
  const assignment = await db.deliveryAssignment.findUnique({
    where: { orderId },
    include: { driver: true, order: true },
  });

  if (!assignment) {
    throw new Error(`No assignment found for order ${orderId}`);
  }

  if (assignment.driverId !== driverId) {
    throw new Error(`Driver ${driverId} is not assigned to order ${orderId}`);
  }

  if (assignment.status !== 'accepted' && assignment.status !== 'arrived_pickup') {
    throw new Error(`Assignment status ${assignment.status} does not allow handoff`);
  }

  // Update assignment
  await db.deliveryAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'picked_up',
      pickedUpAt: new Date(),
    },
  });

  // Transition order
  await transitionOrder(orderId, 'picked_up', 'warehouse', `Order handed off to driver ${assignment.driver.nameEn}`);

  return {
    success: true,
    orderNumber: assignment.order.orderNumber,
    driverName: assignment.driver.nameEn,
    message: `Order handed off to driver ${assignment.driver.nameEn}`,
  };
}

/**
 * Parse delivery address snapshot JSON string.
 */
function parseDeliveryAddress(snapshot: string): {
  area?: string;
} | null {
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

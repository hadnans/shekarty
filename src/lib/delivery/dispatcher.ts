// GGH Delivery Dispatcher — Dispatcher operations and dashboard data
// Provides overview, pending assignments, active deliveries, and recent completions

import { db } from '@/lib/db';
import { type DispatcherOverview } from './types';

/**
 * Get the dispatcher dashboard overview data.
 * Includes active deliveries count, available drivers, pending orders, etc.
 *
 * @returns DispatcherOverview with summary statistics
 */
export async function getDispatcherOverview(): Promise<DispatcherOverview> {
  // Count active deliveries (orders that are out for delivery or being packed)
  const activeDeliveries = await db.order.count({
    where: {
      status: { in: ['packed', 'out_for_delivery'] },
      deletedAt: null,
    },
  });

  // Count available drivers
  const availableDrivers = await db.driver.count({
    where: {
      isActive: true,
      isAvailable: true,
    },
  });

  // Count pending orders (awaiting confirmation/packing)
  const pendingOrders = await db.order.count({
    where: {
      status: { in: ['pending', 'confirmed'] },
      deletedAt: null,
    },
  });

  // Count orders being packed
  const ordersBeingPacked = await db.order.count({
    where: {
      status: 'processing',
      deletedAt: null,
    },
  });

  // Count recent completions (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCompletions = await db.order.count({
    where: {
      status: 'delivered',
      deliveredAt: { gte: yesterday },
      deletedAt: null,
    },
  });

  // Calculate average delivery time for completed orders in the last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const completedOrders = await db.order.findMany({
    where: {
      status: 'delivered',
      deliveredAt: { gte: weekAgo },
      deletedAt: null,
    },
    select: {
      createdAt: true,
      deliveredAt: true,
    },
  });

  let averageDeliveryTime = 0;
  if (completedOrders.length > 0) {
    const totalTime = completedOrders.reduce((sum, order) => {
      if (order.deliveredAt) {
        return sum + (order.deliveredAt.getTime() - order.createdAt.getTime());
      }
      return sum;
    }, 0);
    averageDeliveryTime = Math.round(totalTime / completedOrders.length / (1000 * 60)); // in minutes
  }

  // Get deliveries by status
  const statusCounts = await db.order.groupBy({
    by: ['status'],
    where: { deletedAt: null },
    _count: { status: true },
  });

  const deliveriesByStatus: Record<string, number> = {};
  for (const entry of statusCounts) {
    deliveriesByStatus[entry.status] = entry._count.status;
  }

  return {
    activeDeliveries,
    availableDrivers,
    pendingOrders,
    ordersBeingPacked,
    recentCompletions,
    averageDeliveryTime,
    deliveriesByStatus,
  };
}

/**
 * Get orders that are pending driver assignment.
 * These are confirmed/packed orders without a driver.
 *
 * @returns Array of orders needing driver assignment
 */
export async function getPendingAssignments(): Promise<Array<{
  id: string;
  orderNumber: string;
  status: string;
  createdAt: Date;
  deliverySlot: string;
  deliveryDate: Date | null;
  totalAmount: number;
  customerName: string;
  area: string;
}>> {
  const orders = await db.order.findMany({
    where: {
      status: { in: ['confirmed', 'processing', 'packed'] },
      driverId: null,
      deletedAt: null,
    },
    include: {
      customer: {
        select: { firstName: true, lastName: true },
      },
      assignment: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return orders
    .filter((o) => !o.assignment)
    .map((order) => {
      const addressData = parseDeliveryAddress(order.deliveryAddressSnapshot);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        deliverySlot: order.deliverySlot,
        deliveryDate: order.deliveryDate,
        totalAmount: order.totalAmount,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim() || 'Unknown',
        area: addressData?.area || '',
      };
    });
}

/**
 * Get active deliveries currently in progress.
 *
 * @returns Array of active delivery assignments with order details
 */
export async function getActiveDeliveries(): Promise<Array<{
  id: string;
  orderNumber: string;
  status: string;
  assignmentStatus: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  assignedAt: Date;
  pickedUpAt: Date | null;
  totalAmount: number;
  area: string;
}>> {
  const assignments = await db.deliveryAssignment.findMany({
    where: {
      status: { in: ['assigned', 'accepted', 'arrived_pickup', 'picked_up', 'arrived_delivery'] },
    },
    include: {
      order: true,
      driver: true,
    },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map((a) => {
    const addressData = parseDeliveryAddress(a.order.deliveryAddressSnapshot);
    return {
      id: a.order.id,
      orderNumber: a.order.orderNumber,
      status: a.order.status,
      assignmentStatus: a.status,
      driverId: a.driverId,
      driverName: a.driver.nameEn,
      driverPhone: a.driver.phone,
      assignedAt: a.assignedAt,
      pickedUpAt: a.pickedUpAt,
      totalAmount: a.order.totalAmount,
      area: addressData?.area || '',
    };
  });
}

/**
 * Get recently completed deliveries (last 24 hours).
 *
 * @returns Array of completed delivery assignments
 */
export async function getRecentCompletions(): Promise<Array<{
  id: string;
  orderNumber: string;
  driverName: string;
  deliveredAt: Date | null;
  totalAmount: number;
  area: string;
}>> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const assignments = await db.deliveryAssignment.findMany({
    where: {
      status: 'delivered',
      deliveredAt: { gte: yesterday },
    },
    include: {
      order: true,
      driver: true,
    },
    orderBy: { deliveredAt: 'desc' },
  });

  return assignments.map((a) => {
    const addressData = parseDeliveryAddress(a.order.deliveryAddressSnapshot);
    return {
      id: a.order.id,
      orderNumber: a.order.orderNumber,
      driverName: a.driver.nameEn,
      deliveredAt: a.deliveredAt,
      totalAmount: a.order.totalAmount,
      area: addressData?.area || '',
    };
  });
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

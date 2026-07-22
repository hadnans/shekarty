// GGH Fulfillment — Shipment operations
// Shipment creation, tracking number assignment, status updates

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { TRACKING_PREFIX, SHIPMENT_STATUS_TRANSITIONS } from './config';
import { type ShipmentStatus, type ShipmentInfo } from './types';
import { NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors';

const logger = createLogger('fulfillment-shipment');

// ============================================
// SHIPMENT CREATION
// ============================================

/**
 * Create a shipment for an order.
 * Assigns a tracking number and links to a shipping provider.
 */
export async function createShipment(
  orderId: string,
  providerId: string | null,
  weightKg: number = 0,
  notes: string = ''
): Promise<ShipmentInfo> {
  // Check if shipment already exists for this order
  const existing = await db.shipment.findUnique({
    where: { orderId },
  });

  if (existing) {
    throw new ConflictError('Shipment already exists for this order', 'SHIPMENT_EXISTS');
  }

  // Generate tracking number
  const trackingNumber = generateTrackingNumber();

  const shipment = await db.shipment.create({
    data: {
      orderId,
      providerId,
      trackingNumber,
      status: 'created',
      weightKg,
      notes,
    },
  });

  logger.info('Shipment created', { orderId, trackingNumber, providerId });

  return mapShipmentToInfo(shipment);
}

/**
 * Assign or update tracking number for an existing shipment.
 */
export async function assignTrackingNumber(
  shipmentId: string,
  trackingNumber: string
): Promise<ShipmentInfo> {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment not found', 'SHIPMENT_NOT_FOUND');
  }

  const updated = await db.shipment.update({
    where: { id: shipmentId },
    data: { trackingNumber },
  });

  logger.info('Tracking number assigned', { shipmentId, trackingNumber });

  return mapShipmentToInfo(updated);
}

// ============================================
// SHIPMENT STATUS UPDATES
// ============================================

/**
 * Update shipment status with transition validation.
 */
export async function updateShipmentStatus(
  shipmentId: string,
  newStatus: ShipmentStatus,
  notes?: string
): Promise<ShipmentInfo> {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment not found', 'SHIPMENT_NOT_FOUND');
  }

  const allowedNext = SHIPMENT_STATUS_TRANSITIONS[shipment.status as ShipmentStatus];
  if (!allowedNext || !allowedNext.includes(newStatus)) {
    throw new ForbiddenError(
      `Cannot transition shipment from '${shipment.status}' to '${newStatus}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    ...(notes ? { notes } : {}),
  };

  // Set timestamps based on status
  if (newStatus === 'delivered') {
    updateData.actualDelivery = new Date();
    updateData.estimatedDelivery = new Date();
  }

  const updated = await db.shipment.update({
    where: { id: shipmentId },
    data: updateData,
  });

  // Also update order status based on shipment status
  if (newStatus === 'in_transit') {
    await db.order.update({
      where: { id: shipment.orderId },
      data: { status: 'processing' },
    });
  } else if (newStatus === 'out_for_delivery') {
    await db.order.update({
      where: { id: shipment.orderId },
      data: { status: 'out_for_delivery' },
    });
  } else if (newStatus === 'delivered') {
    await db.order.update({
      where: { id: shipment.orderId },
      data: { status: 'delivered', deliveredAt: new Date() },
    });
  } else if (newStatus === 'failed') {
    await db.order.update({
      where: { id: shipment.orderId },
      data: { status: 'returned' },
    });
  }

  logger.info('Shipment status updated', { shipmentId, newStatus });

  return mapShipmentToInfo(updated);
}

// ============================================
// SHIPMENT LIST
// ============================================

/**
 * Get shipment list with optional filters.
 */
export async function getShipmentList(
  filters?: {
    status?: ShipmentStatus;
    providerId?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ shipments: ShipmentInfo[]; total: number }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.providerId) where.providerId = filters.providerId;

  const [shipments, total] = await Promise.all([
    db.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.shipment.count({ where }),
  ]);

  return {
    shipments: shipments.map(mapShipmentToInfo),
    total,
  };
}

// ============================================
// HELPER — Generate tracking number
// ============================================

function generateTrackingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${TRACKING_PREFIX}-${timestamp}-${random}`;
}

/** Map Prisma shipment to ShipmentInfo interface */
function mapShipmentToInfo(shipment: {
  id: string;
  orderId: string;
  providerId: string | null;
  trackingNumber: string;
  status: string;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;
  weightKg: number;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}): ShipmentInfo {
  return {
    id: shipment.id,
    orderId: shipment.orderId,
    providerId: shipment.providerId,
    trackingNumber: shipment.trackingNumber,
    status: shipment.status as ShipmentStatus,
    estimatedDelivery: shipment.estimatedDelivery?.toISOString() ?? null,
    actualDelivery: shipment.actualDelivery?.toISOString() ?? null,
    weightKg: shipment.weightKg,
    notes: shipment.notes,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
  };
}

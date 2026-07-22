// GGH ETA Calculation — Estimated time of arrival with live GPS and traffic
// Calculates pickup and delivery ETAs for orders

import { db } from '@/lib/db';
import {
  getCurrentTrafficMultiplier,
  VEHICLE_SPEED_KMH,
  DEFAULT_VEHICLE_TYPE,
  AVERAGE_PACKING_TIME_MINUTES,
  AVERAGE_PICKUP_TIME_MINUTES,
  DELIVERY_WINDOW_MINUTES,
} from './config';

/**
 * Calculate ETA for an order based on driver location, destination, and traffic.
 *
 * @param orderId - The order ID to calculate ETA for
 * @returns ETA information including pickup and delivery estimates
 */
export async function calculateETA(orderId: string): Promise<{
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
  estimatedMinutes: number;
  trafficMultiplier: number;
}> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      assignment: { include: { driver: true } },
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const trafficMultiplier = getCurrentTrafficMultiplier();

  // Get destination coordinates
  const destCoords = parseDeliveryAddress(order.deliveryAddressSnapshot);
  const destLat = destCoords?.latitude ?? 30.0444; // Default: Cairo center
  const destLng = destCoords?.longitude ?? 31.2357;

  let pickupMinutes = AVERAGE_PICKUP_TIME_MINUTES;
  let deliveryMinutes = 0;

  if (order.assignment?.driver) {
    const driver = order.assignment.driver;

    // Get driver's latest GPS position
    const gpsLog = await db.gpsPositionLog.findFirst({
      where: { entityId: driver.id, entityType: 'driver' },
      orderBy: { timestamp: 'desc' },
    });

    // Get warehouse location
    let warehouseLat = 30.0444;
    let warehouseLng = 31.2357;
    if (driver.warehouseId) {
      const warehouse = await db.warehouse.findUnique({ where: { id: driver.warehouseId } });
      if (warehouse) {
        warehouseLat = warehouse.latitude;
        warehouseLng = warehouse.longitude;
      }
    }

    const vehicleSpeed = VEHICLE_SPEED_KMH[driver.vehicleType] || VEHICLE_SPEED_KMH[DEFAULT_VEHICLE_TYPE];

    if (gpsLog) {
      // Driver has GPS data — calculate from current position
      const driverLat = gpsLog.latitude;
      const driverLng = gpsLog.longitude;

      // Distance from driver to warehouse
      const distToWarehouse = haversineDistance(driverLat, driverLng, warehouseLat, warehouseLng);
      pickupMinutes = (distToWarehouse / vehicleSpeed) * 60 * trafficMultiplier;
      pickupMinutes = Math.max(5, Math.round(pickupMinutes)); // Minimum 5 minutes

      // Distance from warehouse to customer
      const distToCustomer = haversineDistance(warehouseLat, warehouseLng, destLat, destLng);
      deliveryMinutes = (distToCustomer / vehicleSpeed) * 60 * trafficMultiplier;
      deliveryMinutes = Math.max(10, Math.round(deliveryMinutes)); // Minimum 10 minutes
    } else {
      // No GPS data — use default estimates
      pickupMinutes = AVERAGE_PICKUP_TIME_MINUTES;

      // Estimate delivery time based on warehouse to customer distance
      const distToCustomer = haversineDistance(warehouseLat, warehouseLng, destLat, destLng);
      deliveryMinutes = (distToCustomer / vehicleSpeed) * 60 * trafficMultiplier;
      deliveryMinutes = Math.max(15, Math.round(deliveryMinutes));
    }
  } else {
    // No driver assigned yet — estimate based on packing + default delivery time
    pickupMinutes = AVERAGE_PACKING_TIME_MINUTES + AVERAGE_PICKUP_TIME_MINUTES;
    deliveryMinutes = 45; // Default 45 min delivery estimate
  }

  const now = new Date();
  const estimatedPickupTime = new Date(now.getTime() + pickupMinutes * 60 * 1000);
  const totalMinutes = pickupMinutes + deliveryMinutes + AVERAGE_HANDOFF_TIME_MINUTES;
  const estimatedDeliveryTime = new Date(now.getTime() + totalMinutes * 60 * 1000);

  return {
    estimatedPickupTime: estimatedPickupTime.toISOString(),
    estimatedDeliveryTime: estimatedDeliveryTime.toISOString(),
    estimatedMinutes: Math.round(totalMinutes),
    trafficMultiplier,
  };
}

/**
 * Estimate a delivery time window for an order.
 * Returns a time range (e.g., "3:00 PM - 4:00 PM").
 *
 * @param orderId - The order ID to estimate delivery window for
 * @returns Time window string in EN format
 */
export async function estimateDeliveryWindow(orderId: string): Promise<{
  windowStart: string;
  windowEnd: string;
  windowLabelEn: string;
  windowLabelAr: string;
}> {
  const eta = await calculateETA(orderId);

  const deliveryTime = new Date(eta.estimatedDeliveryTime);
  const windowStart = new Date(deliveryTime.getTime() - (DELIVERY_WINDOW_MINUTES / 2) * 60 * 1000);
  const windowEnd = new Date(deliveryTime.getTime() + (DELIVERY_WINDOW_MINUTES / 2) * 60 * 1000);

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatTimeAr = (date: Date): string =>
    date.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true });

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    windowLabelEn: `${formatTime(windowStart)} - ${formatTime(windowEnd)}`,
    windowLabelAr: `${formatTimeAr(windowStart)} - ${formatTimeAr(windowEnd)}`,
  };
}

/**
 * Calculate the Haversine distance between two coordinates.
 *
 * @param lat1 - First point latitude
 * @param lng1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lng2 - Second point longitude
 * @returns Distance in kilometers
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians.
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Parse delivery address snapshot JSON string.
 */
function parseDeliveryAddress(snapshot: string): {
  latitude?: number;
  longitude?: number;
} | null {
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

/** Import for AVERAGE_HANDOFF_TIME_MINUTES constant reference */
const AVERAGE_HANDOFF_TIME_MINUTES = 5;

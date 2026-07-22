// GGH Delivery Assignment — Driver assignment algorithm
// Handles manual, automatic, and reassignment of drivers to orders

import { db } from '@/lib/db';
import {
  type AssignmentResult,
  type DriverCandidate,
  type DeliveryStep,
} from './types';
import {
  DRIVER_SEARCH_RADIUS_KM,
  MAX_ACTIVE_DELIVERIES_PER_DRIVER,
  MIN_DRIVER_RATING,
  ASSIGNMENT_WEIGHTS,
} from './config';
import { transitionOrder } from './tracking';
import { calculateETA } from './eta';

/**
 * Manually assign a specific driver to an order.
 * Validates that the driver is available and the order is in an assignable state.
 *
 * @param orderId - The order ID to assign a driver to
 * @param driverId - The driver ID to assign
 * @returns AssignmentResult with assignment details
 */
export async function assignDriver(
  orderId: string,
  driverId: string
): Promise<AssignmentResult> {
  // Validate order exists and is in an assignable state
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { assignment: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.assignment) {
    throw new Error(`Order ${orderId} already has a driver assignment`);
  }

  const currentStep = mapOrderStatusToStepSimple(order.status);
  const assignableSteps: DeliveryStep[] = ['ready_for_pickup', 'order_confirmed', 'being_packed', 'driver_assigned'];

  if (!assignableSteps.includes(currentStep) && currentStep !== 'order_placed') {
    throw new Error(`Order is in status ${order.status} and cannot accept driver assignment`);
  }

  // Validate driver exists and is available
  const driver = await db.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new Error(`Driver not found: ${driverId}`);
  }

  if (!driver.isActive || !driver.isAvailable) {
    throw new Error(`Driver ${driverId} is not available`);
  }

  // Check driver's current load
  const activeAssignments = await db.deliveryAssignment.count({
    where: {
      driverId,
      status: { in: ['assigned', 'accepted', 'arrived_pickup', 'picked_up', 'arrived_delivery'] },
    },
  });

  if (activeAssignments >= MAX_ACTIVE_DELIVERIES_PER_DRIVER) {
    throw new Error(`Driver ${driverId} has reached maximum active deliveries`);
  }

  // Calculate ETAs
  const etaResult = await calculateETA(orderId);

  // Create delivery assignment
  await db.deliveryAssignment.create({
    data: {
      orderId,
      driverId,
      warehouseId: driver.warehouseId,
      status: 'assigned',
    },
  });

  // Update order with driver info
  await db.order.update({
    where: { id: orderId },
    data: {
      driverId,
      driverName: driver.nameEn,
      driverPhone: driver.phone,
    },
  });

  // Transition order to driver_assigned if needed
  if (currentStep === 'ready_for_pickup' || currentStep === 'order_placed' || currentStep === 'order_confirmed' || currentStep === 'being_packed') {
    // First make sure we're at ready_for_pickup
    if (currentStep !== 'ready_for_pickup') {
      // Step through to ready_for_pickup
      const stepsToAdvance: DeliveryStep[] = [];
      if (currentStep === 'order_placed') stepsToAdvance.push('order_confirmed', 'being_packed', 'ready_for_pickup');
      else if (currentStep === 'order_confirmed') stepsToAdvance.push('being_packed', 'ready_for_pickup');
      else if (currentStep === 'being_packed') stepsToAdvance.push('ready_for_pickup');

      for (const step of stepsToAdvance) {
        await transitionOrder(orderId, step, 'system', `Auto-advanced during driver assignment`);
      }
    }

    await transitionOrder(orderId, 'driver_assigned', 'admin', `Driver ${driver.nameEn} assigned`);
  }

  return {
    success: true,
    driverId: driver.id,
    driverName: driver.nameEn,
    estimatedPickupTime: etaResult.estimatedPickupTime,
    estimatedDeliveryTime: etaResult.estimatedDeliveryTime,
    reason: `Driver ${driver.nameEn} manually assigned`,
  };
}

/**
 * Automatically find and assign the best available driver for an order.
 * Scores candidates by distance, rating, and current load.
 *
 * @param orderId - The order ID to auto-assign a driver to
 * @returns AssignmentResult with assignment details
 */
export async function autoAssignDriver(orderId: string): Promise<AssignmentResult> {
  // Validate order
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { assignment: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (order.assignment) {
    throw new Error(`Order ${orderId} already has a driver assignment`);
  }

  // Find the delivery zone / area for the order
  const addressData = parseDeliveryAddress(order.deliveryAddressSnapshot);
  const area = addressData?.area || '';

  // Step 1: Find warehouse for the delivery zone
  let warehouseId: string | null = null;
  if (area) {
    const zone = await db.deliveryZone.findFirst({
      where: { area, isActive: true },
    });
    if (zone) {
      // Find warehouse serving this area
      const warehouse = await db.warehouse.findFirst({
        where: { area, isActive: true },
      });
      if (warehouse) {
        warehouseId = warehouse.id;
      }
    }
  }

  // Step 2: Find available drivers
  let candidates: DriverCandidate[] = [];

  // First try drivers assigned to the warehouse
  if (warehouseId) {
    candidates = await scoreDriverCandidates(warehouseId, orderId);
  }

  // If no warehouse drivers available, find nearby available drivers
  if (candidates.length === 0) {
    const allAvailableDrivers = await db.driver.findMany({
      where: {
        isActive: true,
        isAvailable: true,
        rating: { gte: MIN_DRIVER_RATING },
      },
    });

    candidates = allAvailableDrivers.map((d) => ({
      driverId: d.id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      distance: d.warehouseId ? 5 : 10, // Default distance estimate
      rating: d.rating,
      currentLoad: 0,
      score: 0,
    }));

    // Score them
    candidates = candidates.map((c) => ({
      ...c,
      score: calculateDriverScore(c),
    })).sort((a, b) => b.score - a.score);
  }

  if (candidates.length === 0) {
    throw new Error('No available drivers found for auto-assignment');
  }

  // Assign the best candidate
  const best = candidates[0];
  return assignDriver(orderId, best.driverId);
}

/**
 * Reassign a different driver to an order that already has an assignment.
 *
 * @param orderId - The order ID to reassign
 * @param newDriverId - The new driver ID
 * @param reason - Reason for reassignment
 * @returns AssignmentResult with new assignment details
 */
export async function reassignDriver(
  orderId: string,
  newDriverId: string,
  reason: string
): Promise<AssignmentResult> {
  // Validate existing assignment
  const assignment = await db.deliveryAssignment.findUnique({
    where: { orderId },
  });

  if (!assignment) {
    throw new Error(`No existing assignment for order ${orderId}`);
  }

  // Cannot reassign if already picked up or delivered
  if (['picked_up', 'arrived_delivery', 'delivered', 'failed', 'cancelled'].includes(assignment.status)) {
    throw new Error(`Cannot reassign order in status: ${assignment.status}`);
  }

  // Cancel the old assignment
  await db.deliveryAssignment.update({
    where: { id: assignment.id },
    data: {
      status: 'cancelled',
      notes: `Reassigned: ${reason}`,
    },
  });

  // Make old driver available again
  await db.driver.update({
    where: { id: assignment.driverId },
    data: { isAvailable: true },
  });

  // Assign new driver (this creates a new assignment record)
  const result = await assignDriver(orderId, newDriverId);
  result.reason = `Reassigned: ${reason}`;
  return result;
}

/**
 * Score and rank driver candidates for auto-assignment.
 *
 * @param warehouseId - Warehouse ID to find drivers for
 * @param orderId - Order ID being assigned
 * @returns Scored and ranked driver candidates
 */
async function scoreDriverCandidates(
  warehouseId: string,
  _orderId: string
): Promise<DriverCandidate[]> {
  // Find drivers for this warehouse
  const drivers = await db.driver.findMany({
    where: {
      warehouseId,
      isActive: true,
      isAvailable: true,
      rating: { gte: MIN_DRIVER_RATING },
    },
  });

  const candidates: DriverCandidate[] = [];

  for (const driver of drivers) {
    // Get current load
    const activeCount = await db.deliveryAssignment.count({
      where: {
        driverId: driver.id,
        status: { in: ['assigned', 'accepted', 'arrived_pickup', 'picked_up', 'arrived_delivery'] },
      },
    });

    // Skip drivers at max load
    if (activeCount >= MAX_ACTIVE_DELIVERIES_PER_DRIVER) continue;

    // Estimate distance (use warehouse location as proxy)
    const warehouse = await db.warehouse.findUnique({ where: { id: warehouseId } });
    const distance = warehouse ? estimateDistance(driver, warehouse.latitude, warehouse.longitude) : 5;

    const candidate: DriverCandidate = {
      driverId: driver.id,
      nameEn: driver.nameEn,
      nameAr: driver.nameAr,
      distance,
      rating: driver.rating,
      currentLoad: activeCount,
      score: 0,
    };

    candidate.score = calculateDriverScore(candidate);
    candidates.push(candidate);
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Calculate a score for a driver candidate based on distance, rating, and load.
 *
 * @param candidate - Driver candidate data
 * @returns Score between 0-100
 */
function calculateDriverScore(candidate: DriverCandidate): number {
  // Distance score: closer is better (max 10km → 0, 0km → 100)
  const distanceScore = Math.max(0, 100 - (candidate.distance / DRIVER_SEARCH_RADIUS_KM) * 100);

  // Rating score: 5-star → 100, 3.5-star → 0
  const ratingScore = ((candidate.rating - MIN_DRIVER_RATING) / (5 - MIN_DRIVER_RATING)) * 100;

  // Load score: fewer deliveries → better (0 → 100, max → 0)
  const loadScore = Math.max(0, 100 - (candidate.currentLoad / MAX_ACTIVE_DELIVERIES_PER_DRIVER) * 100);

  return (
    distanceScore * ASSIGNMENT_WEIGHTS.distance +
    ratingScore * ASSIGNMENT_WEIGHTS.rating +
    loadScore * ASSIGNMENT_WEIGHTS.currentLoad
  );
}

/**
 * Estimate distance from driver to a point.
 * Uses warehouse location as a proxy since we don't have live GPS for all drivers.
 *
 * @param driver - Driver data
 * @param targetLat - Target latitude
 * @param targetLng - Target longitude
 * @returns Estimated distance in km
 */
function estimateDistance(
  driver: { id: string; warehouseId: string | null },
  targetLat: number,
  targetLng: number
): number {
  // For drivers with a warehouse, use the warehouse location
  // Since we're already filtering by warehouse, distance is minimal
  void driver;
  void targetLat;
  void targetLng;
  return 2; // Default 2km estimate for same-warehouse drivers
}

/**
 * Simple mapping of order status to delivery step for assignment logic.
 */
function mapOrderStatusToStepSimple(status: string): DeliveryStep {
  const map: Record<string, DeliveryStep> = {
    pending: 'order_placed',
    confirmed: 'order_confirmed',
    processing: 'being_packed',
    packed: 'ready_for_pickup',
    out_for_delivery: 'picked_up',
    delivered: 'delivered',
    cancelled: 'cancelled',
    returned: 'delivery_failed',
  };
  return map[status] || 'order_placed';
}

/**
 * Parse delivery address snapshot JSON string.
 */
function parseDeliveryAddress(snapshot: string): {
  area?: string;
  latitude?: number;
  longitude?: number;
} | null {
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

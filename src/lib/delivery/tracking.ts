// GGH Delivery Tracking — Order tracking state machine
// Enforces strict state transitions and builds timeline data

import { db } from '@/lib/db';
import {
  type DeliveryStep,
  type DeliveryTracking,
  type DeliveryStepTimeline,
  type DriverInfo,
  type WarehouseInfo,
  VALID_TRANSITIONS,
  STEP_TO_ORDER_STATUS,
  DELIVERY_STEPS_ORDER,
  STEP_LABELS,
} from './types';

/**
 * Transition an order to a new delivery step.
 * Validates that the transition is allowed before applying.
 * Creates an OrderStatusHistory record and updates the Order status.
 *
 * @param orderId - The order ID to transition
 * @param newStep - The target delivery step
 * @param changedBy - Who initiated the change (system, customer, admin, driver)
 * @param note - Optional note about the transition
 * @returns The updated order or throws on invalid transition
 */
export async function transitionOrder(
  orderId: string,
  newStep: DeliveryStep,
  changedBy: string,
  note?: string
): Promise<{ success: boolean; orderNumber: string; newStep: DeliveryStep }> {
  // Fetch the order with its current status history
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // Determine current delivery step from order status
  const currentStep = mapOrderStatusToStep(order.status, order.statusHistory);

  // Validate the transition
  const allowedTransitions = VALID_TRANSITIONS[currentStep];
  if (!allowedTransitions.includes(newStep)) {
    throw new Error(
      `Invalid transition: ${currentStep} → ${newStep}. Allowed: ${allowedTransitions.join(', ')}`
    );
  }

  // Map delivery step to order status
  const newOrderStatus = STEP_TO_ORDER_STATUS[newStep];

  // Create status history record
  await db.orderStatusHistory.create({
    data: {
      orderId,
      status: newOrderStatus,
      note: note || `Delivery step: ${newStep}`,
      changedBy,
    },
  });

  // Update order status
  const updateData: Record<string, unknown> = {
    status: newOrderStatus,
  };

  // Set deliveredAt if the order is delivered
  if (newStep === 'delivered') {
    updateData.deliveredAt = new Date();
  }

  await db.order.update({
    where: { id: orderId },
    data: updateData,
  });

  // Update delivery assignment status if exists
  if (newStep === 'driver_assigned' || newStep === 'picked_up' || newStep === 'delivered' || newStep === 'delivery_failed') {
    const assignment = await db.deliveryAssignment.findUnique({
      where: { orderId },
    });

    if (assignment) {
      const assignmentStatusMap: Record<string, string> = {
        driver_assigned: 'assigned',
        picked_up: 'picked_up',
        delivered: 'delivered',
        delivery_failed: 'failed',
      };

      const assignmentUpdateData: Record<string, unknown> = {
        status: assignmentStatusMap[newStep] || assignment.status,
      };

      if (newStep === 'picked_up') {
        assignmentUpdateData.pickedUpAt = new Date();
      } else if (newStep === 'delivered') {
        assignmentUpdateData.deliveredAt = new Date();
      } else if (newStep === 'delivery_failed') {
        assignmentUpdateData.failedAt = new Date();
      }

      await db.deliveryAssignment.update({
        where: { id: assignment.id },
        data: assignmentUpdateData,
      });
    }
  }

  return {
    success: true,
    orderNumber: order.orderNumber,
    newStep,
  };
}

/**
 * Get full tracking information for a customer-facing tracking view.
 *
 * @param orderId - The order ID to get tracking for
 * @returns Complete DeliveryTracking data or null if order not found
 */
export async function getTrackingInfo(orderId: string): Promise<DeliveryTracking | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      statusHistory: { orderBy: { createdAt: 'asc' } },
      assignment: {
        include: {
          driver: true,
        },
      },
    },
  });

  if (!order) return null;

  // Get warehouse info from assignment or delivery zone
  let warehouse: WarehouseInfo | undefined;
  if (order.assignment?.driver?.warehouseId) {
    const wh = await db.warehouse.findUnique({
      where: { id: order.assignment.driver.warehouseId },
    });
    if (wh) {
      warehouse = {
        id: wh.id,
        nameEn: wh.nameEn,
        nameAr: wh.nameAr,
        address: wh.address,
        phone: wh.phone,
      };
    }
  }

  // If no warehouse from driver, try to find one in the delivery area
  if (!warehouse) {
    const addressData = parseDeliveryAddress(order.deliveryAddressSnapshot);
    if (addressData?.area) {
      const wh = await db.warehouse.findFirst({
        where: { area: addressData.area, isActive: true },
      });
      if (wh) {
        warehouse = {
          id: wh.id,
          nameEn: wh.nameEn,
          nameAr: wh.nameAr,
          address: wh.address,
          phone: wh.phone,
        };
      }
    }
  }

  // Build driver info
  let driver: DriverInfo | undefined;
  if (order.assignment?.driver) {
    const d = order.assignment.driver;
    driver = {
      id: d.id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      phone: d.phone,
      vehicleType: d.vehicleType,
      vehiclePlate: d.vehiclePlate,
      rating: d.rating,
    };
  } else if (order.driverId) {
    // Legacy: driver info from order fields
    const d = await db.driver.findUnique({ where: { id: order.driverId } });
    if (d) {
      driver = {
        id: d.id,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
        phone: d.phone,
        vehicleType: d.vehicleType,
        vehiclePlate: d.vehiclePlate,
        rating: d.rating,
      };
    }
  }

  // Get driver location from GPS logs
  let driverLocation: DeliveryTracking['driverLocation'];
  if (order.assignment?.driverId) {
    const gpsLog = await db.gpsPositionLog.findFirst({
      where: { entityId: order.assignment.driverId, entityType: 'driver' },
      orderBy: { timestamp: 'desc' },
    });
    if (gpsLog) {
      driverLocation = {
        lat: gpsLog.latitude,
        lng: gpsLog.longitude,
        heading: gpsLog.heading,
        speed: gpsLog.speed,
        lastUpdated: gpsLog.timestamp.toISOString(),
      };
    }
  }

  // Get customer location from address snapshot
  let customerLocation: DeliveryTracking['customerLocation'];
  const addressData = parseDeliveryAddress(order.deliveryAddressSnapshot);
  if (addressData?.latitude && addressData?.longitude) {
    customerLocation = {
      lat: addressData.latitude,
      lng: addressData.longitude,
    };
  }

  // Determine current delivery step
  const currentStep = mapOrderStatusToStep(order.status, order.statusHistory);

  // Build step timeline
  const steps = buildStepTimeline(order.statusHistory, currentStep, order.deliveredAt);

  // Calculate estimated delivery time
  let estimatedDeliveryTime: string | undefined;
  if (order.deliveryDate && currentStep !== 'delivered' && currentStep !== 'cancelled' && currentStep !== 'delivery_failed') {
    estimatedDeliveryTime = new Date(order.deliveryDate).toISOString();
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    currentStep,
    steps,
    driver,
    warehouse,
    estimatedDeliveryTime,
    actualDeliveryTime: order.deliveredAt?.toISOString() ?? undefined,
    customerLocation,
    driverLocation,
  };
}

/**
 * Build the visual step timeline with completion status.
 *
 * @param statusHistory - Order status history records
 * @param currentStep - Current delivery step
 * @param deliveredAt - When the order was delivered
 * @returns Array of timeline steps with completion info
 */
export function buildStepTimeline(
  statusHistory: Array<{ status: string; note: string; createdAt: Date }>,
  currentStep: DeliveryStep,
  deliveredAt: Date | null
): DeliveryStepTimeline[] {
  // Build a map of completed statuses and their timestamps
  const completedStatuses = new Map<string, Date>();
  for (const entry of statusHistory) {
    if (!completedStatuses.has(entry.status)) {
      completedStatuses.set(entry.status, entry.createdAt);
    }
  }

  const currentIdx = DELIVERY_STEPS_ORDER.indexOf(currentStep);
  const isFailed = currentStep === 'delivery_failed';
  const isCancelled = currentStep === 'cancelled';

  return DELIVERY_STEPS_ORDER.map((step, idx) => {
    const orderStatus = STEP_TO_ORDER_STATUS[step];
    const completedDate = completedStatuses.get(orderStatus);
    const isCompleted = idx < currentIdx || (idx === currentIdx && currentStep === 'delivered');
    const isCurrent = idx === currentIdx && currentStep !== 'delivered';

    const labels = STEP_LABELS[step];

    return {
      step,
      labelEn: labels.en,
      labelAr: labels.ar,
      descriptionEn: labels.descEn,
      descriptionAr: labels.descAr,
      completedAt: completedDate?.toISOString() ?? (isCompleted ? (deliveredAt?.toISOString() ?? null) : null),
      isCurrent: isCancelled || isFailed ? false : isCurrent,
    };
  }).filter((step) => {
    // Show failed/cancelled as the last step
    if (!isFailed && !isCancelled) return true;
    // For cancelled/failed, show steps up to current
    const stepIdx = DELIVERY_STEPS_ORDER.indexOf(step.step);
    return stepIdx <= currentIdx;
  });
}

/**
 * Map an order status string back to a DeliveryStep.
 * Uses status history to determine the most granular step.
 *
 * @param orderStatus - The current order status
 * @param statusHistory - The status history records
 * @returns The corresponding DeliveryStep
 */
export function mapOrderStatusToStep(
  orderStatus: string,
  statusHistory: Array<{ status: string; note: string; createdAt: Date }>
): DeliveryStep {
  // Check if the latest status history note contains a delivery step
  if (statusHistory.length > 0) {
    const latestEntry = statusHistory[0];
    if (latestEntry.note?.startsWith('Delivery step:')) {
      const stepFromNote = latestEntry.note.replace('Delivery step:', '').trim() as DeliveryStep;
      if (STEP_LABELS[stepFromNote]) {
        return stepFromNote;
      }
    }
  }

  // Fallback: map order status to the most relevant delivery step
  const statusToStep: Record<string, DeliveryStep> = {
    pending: 'order_placed',
    confirmed: 'order_confirmed',
    processing: 'being_packed',
    packed: 'ready_for_pickup',
    out_for_delivery: 'picked_up',
    delivered: 'delivered',
    cancelled: 'cancelled',
    returned: 'delivery_failed',
  };

  return statusToStep[orderStatus] || 'order_placed';
}

/**
 * Parse delivery address snapshot JSON string.
 *
 * @param snapshot - JSON string of the delivery address
 * @returns Parsed address object or null
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

/**
 * Validate that a state transition is allowed.
 *
 * @param from - Current delivery step
 * @param to - Target delivery step
 * @returns True if the transition is valid
 */
export function isValidTransition(from: DeliveryStep, to: DeliveryStep): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

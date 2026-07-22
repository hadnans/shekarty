// GGH Delivery System — Barrel export
// Re-exports all delivery system modules

// Configuration
export {
  DRIVER_SEARCH_RADIUS_KM,
  MAX_ACTIVE_DELIVERIES_PER_DRIVER,
  MIN_DRIVER_RATING,
  ASSIGNMENT_EXPIRY_MINUTES,
  TRAFFIC_MULTIPLIERS,
  VEHICLE_SPEED_KMH,
  DEFAULT_VEHICLE_TYPE,
  AVERAGE_PACKING_TIME_MINUTES,
  AVERAGE_PICKUP_TIME_MINUTES,
  AVERAGE_HANDOFF_TIME_MINUTES,
  DELIVERY_WINDOW_MINUTES,
  ASSIGNMENT_WEIGHTS,
  getCurrentTrafficMultiplier,
} from './config';

// Types
export {
  type DeliveryStep,
  type DeliveryTracking,
  type DeliveryStepTimeline,
  type DriverInfo,
  type WarehouseInfo,
  type DriverLocation,
  type AssignmentResult,
  type DispatcherOverview,
  type DriverCandidate,
  type DeliveryNotificationTemplate,
  VALID_TRANSITIONS,
  STEP_TO_ORDER_STATUS,
  DELIVERY_STEPS_ORDER,
  STEP_LABELS,
  getStepLabel,
  getStepDescription,
} from './types';

// Assignment
export {
  assignDriver,
  autoAssignDriver,
  reassignDriver,
} from './assignment';

// Tracking
export {
  transitionOrder,
  getTrackingInfo,
  buildStepTimeline,
  mapOrderStatusToStep,
  isValidTransition,
} from './tracking';

// Dispatcher
export {
  getDispatcherOverview,
  getPendingAssignments,
  getActiveDeliveries,
  getRecentCompletions,
} from './dispatcher';

// Warehouse Operations
export {
  getPendingPackingOrders,
  markAsPacked,
  handoffToDriver,
} from './warehouse-ops';

// ETA
export {
  calculateETA,
  estimateDeliveryWindow,
} from './eta';

// Notifications
export {
  getNotificationTemplate,
  sendDeliveryNotification,
  getAllNotificationTemplates,
} from './notifications';

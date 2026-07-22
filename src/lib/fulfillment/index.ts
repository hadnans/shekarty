// GGH Fulfillment System — Barrel export
// Re-exports all fulfillment system modules

// Configuration
export {
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
  DEFAULT_WAREHOUSE_ID,
  PICKING_TIMEOUT_MINUTES,
  PACKING_TIMEOUT_MINUTES,
  MAX_PICK_LIST_ITEMS,
  MAX_PACK_ITEMS,
  TRACKING_PREFIX,
  RETURN_WINDOW_DAYS,
  MAX_REFUND_PERCENTAGE,
  RESTOCKING_GRACE_DAYS,
  BATCH_STATUS_TRANSITIONS,
  ITEM_STATUS_TRANSITIONS,
  SHIPMENT_STATUS_TRANSITIONS,
} from './config';

// Types
export {
  type BatchStatus,
  type BatchItemStatus,
  type FulfillmentBatch,
  type FulfillmentItem,
  type PickList,
  type PickListGroup,
  type PackVerification,
  type PackVerificationItem,
  type ShipmentStatus,
  type ShipmentInfo,
  type ReturnStatus,
  type ReturnRequest,
  type ReturnItem,
  type RefundCalculation,
  type ShippingProviderConfig,
  getBatchStatusLabel,
  getShipmentStatusLabel,
  getReturnStatusLabel,
} from './types';

// Picking
export {
  generatePickList,
  startPicking,
  completePicking,
} from './picking';

// Packing
export {
  getPackVerification,
  startPacking,
  completePacking,
} from './packing';

// Shipment
export {
  createShipment,
  assignTrackingNumber,
  updateShipmentStatus,
  getShipmentList,
} from './shipment';

// Returns
export {
  initiateReturn,
  calculateRefund,
  updateReturnStatus,
  restockItems,
  getReturnHistory,
} from './returns';

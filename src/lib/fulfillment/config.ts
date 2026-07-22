// GGH Fulfillment System Configuration
// Centralized configuration constants for fulfillment operations

/** Maximum number of orders per fulfillment batch */
export const MAX_BATCH_SIZE = 50;

/** Minimum number of orders required to create a batch */
export const MIN_BATCH_SIZE = 5;

/** Default warehouse for batch creation when none specified */
export const DEFAULT_WAREHOUSE_ID = '';

/** Timeout in minutes for picking a batch */
export const PICKING_TIMEOUT_MINUTES = 120;

/** Timeout in minutes for packing a batch */
export const PACKING_TIMEOUT_MINUTES = 60;

/** Maximum items per pick list */
export const MAX_PICK_LIST_ITEMS = 100;

/** Maximum items per pack verification */
export const MAX_PACK_ITEMS = 50;

/** Default tracking number prefix for shipments */
export const TRACKING_PREFIX = 'GGH';

/** Maximum days for return processing */
export const RETURN_WINDOW_DAYS = 14;

/** Maximum refund percentage for partial returns */
export const MAX_REFUND_PERCENTAGE = 100;

/** Restocking grace period in days — items must be in sellable condition */
export const RESTOCKING_GRACE_DAYS = 7;

/** Fulfillment batch status transitions — each status can only transition to specific next statuses */
export const BATCH_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['picking', 'cancelled'],
  picking: ['picked', 'cancelled'],
  picked: ['packing', 'cancelled'],
  packing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Fulfillment batch item status transitions */
export const ITEM_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['picking', 'skipped'],
  picking: ['picked', 'short', 'skipped'],
  picked: ['packing'],
  packing: ['packed', 'damaged'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  short: [],
  skipped: [],
  damaged: [],
};

/** Shipment status transitions */
export const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  created: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'failed', 'cancelled'],
  delivered: [],
  failed: ['returned'],
  returned: [],
  cancelled: [],
};

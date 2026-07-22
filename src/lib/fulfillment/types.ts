// GGH Fulfillment Types — Type definitions for the fulfillment system

import { type Piastres, type Lang } from '@/types/ggh';

// ============================================
// FULFILLMENT BATCH
// ============================================

/** All possible fulfillment batch statuses */
export type BatchStatus =
  | 'pending'
  | 'picking'
  | 'picked'
  | 'packing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** All possible fulfillment batch item statuses */
export type BatchItemStatus =
  | 'pending'
  | 'picking'
  | 'picked'
  | 'short'
  | 'packing'
  | 'packed'
  | 'damaged'
  | 'shipped'
  | 'delivered'
  | 'skipped';

/** Fulfillment batch with full details */
export interface FulfillmentBatch {
  id: string;
  warehouseId: string;
  status: BatchStatus;
  totalOrders: number;
  totalItems: number;
  assignedAt: string | null;
  pickedAt: string | null;
  packedAt: string | null;
  shippedAt: string | null;
  items: FulfillmentItem[];
  createdAt: string;
  updatedAt: string;
}

/** A single item within a fulfillment batch */
export interface FulfillmentItem {
  id: string;
  batchId: string;
  orderId: string;
  productId: string;
  quantity: number;
  pickedQuantity: number;
  status: BatchItemStatus;
}

// ============================================
// PICK LIST
// ============================================

/** Pick list for a warehouse batch — grouped by product for efficiency */
export interface PickList {
  batchId: string;
  warehouseId: string;
  warehouseName: string;
  items: PickListGroup[];
  totalProducts: number;
  totalQuantity: number;
  createdAt: string;
}

/** A grouped set of pick items for the same product */
export interface PickListGroup {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  icon: string;
  location: string;
  totalQuantity: number;
  orderIds: string[];
  picked: boolean;
}

// ============================================
// PACK VERIFICATION
// ============================================

/** Pack verification result for a single order */
export interface PackVerification {
  orderId: string;
  orderNumber: string;
  items: PackVerificationItem[];
  allItemsVerified: boolean;
  verifiedAt: string | null;
}

/** Individual item verification within a pack */
export interface PackVerificationItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  expectedQuantity: number;
  actualQuantity: number;
  verified: boolean;
}

// ============================================
// SHIPMENT
// ============================================

/** All possible shipment statuses */
export type ShipmentStatus =
  | 'created'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';

/** Shipment details */
export interface ShipmentInfo {
  id: string;
  orderId: string;
  providerId: string | null;
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  weightKg: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// RETURNS
// ============================================

/** All possible return statuses */
export type ReturnStatus =
  | 'initiated'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'inspected'
  | 'refunded'
  | 'restocked';

/** Return request details */
export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  reasonAr: string;
  items: ReturnItem[];
  totalRefundAmount: Piastres;
  status: ReturnStatus;
  initiatedAt: string;
  processedAt: string | null;
}

/** Individual item within a return request */
export interface ReturnItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  quantity: number;
  unitPrice: Piastres;
  refundAmount: Piastres;
  condition: 'sellable' | 'damaged' | 'expired';
  restocked: boolean;
}

/** Refund calculation result */
export interface RefundCalculation {
  orderId: string;
  totalPaid: Piastres;
  itemsRefund: Piastres;
  deliveryFeeRefund: Piastres;
  totalRefund: Piastres;
  deduction: Piastres;
  deductionReason: string;
}

// ============================================
// SHIPPING PROVIDER
// ============================================

/** Shipping provider configuration */
export interface ShippingProviderConfig {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  apiEndpoint: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get the batch status label in the specified language */
export function getBatchStatusLabel(status: BatchStatus, lang: Lang): string {
  const labels: Record<BatchStatus, { en: string; ar: string }> = {
    pending: { en: 'Pending', ar: 'قيد الانتظار' },
    picking: { en: 'Picking', ar: 'جاري الانتقاء' },
    picked: { en: 'Picked', ar: 'تم الانتقاء' },
    packing: { en: 'Packing', ar: 'جاري التغليف' },
    packed: { en: 'Packed', ar: 'تم التغليف' },
    shipped: { en: 'Shipped', ar: 'تم الشحن' },
    delivered: { en: 'Delivered', ar: 'تم التوصيل' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };
  return lang === 'ar' ? labels[status].ar : labels[status].en;
}

/** Get the shipment status label in the specified language */
export function getShipmentStatusLabel(status: ShipmentStatus, lang: Lang): string {
  const labels: Record<ShipmentStatus, { en: string; ar: string }> = {
    created: { en: 'Created', ar: 'تم الإنشاء' },
    in_transit: { en: 'In Transit', ar: 'في الطريق' },
    out_for_delivery: { en: 'Out for Delivery', ar: 'جاهز للتوصيل' },
    delivered: { en: 'Delivered', ar: 'تم التوصيل' },
    failed: { en: 'Failed', ar: 'فشل' },
    returned: { en: 'Returned', ar: 'مرتجع' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };
  return lang === 'ar' ? labels[status].ar : labels[status].en;
}

/** Get the return status label in the specified language */
export function getReturnStatusLabel(status: ReturnStatus, lang: Lang): string {
  const labels: Record<ReturnStatus, { en: string; ar: string }> = {
    initiated: { en: 'Initiated', ar: 'تم البدء' },
    approved: { en: 'Approved', ar: 'تم الموافقة' },
    rejected: { en: 'Rejected', ar: 'تم الرفض' },
    received: { en: 'Received', ar: 'تم الاستلام' },
    inspected: { en: 'Inspected', ar: 'تم الفحص' },
    refunded: { en: 'Refunded', ar: 'تم الاسترداد' },
    restocked: { en: 'Restocked', ar: 'تم الإعادة' },
  };
  return lang === 'ar' ? labels[status].ar : labels[status].en;
}

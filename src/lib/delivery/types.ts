// GGH Delivery Types — Type definitions for the delivery tracking system

import { type Lang } from '@/types/ggh';

/** All possible delivery steps in the order lifecycle */
export type DeliveryStep =
  | 'order_placed'
  | 'order_confirmed'
  | 'being_packed'
  | 'ready_for_pickup'
  | 'driver_assigned'
  | 'driver_en_route'
  | 'driver_arrived_pickup'
  | 'picked_up'
  | 'driver_en_route_delivery'
  | 'driver_arrived_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'cancelled';

/** Complete delivery tracking data for customer view */
export interface DeliveryTracking {
  orderId: string;
  orderNumber: string;
  currentStep: DeliveryStep;
  steps: DeliveryStepTimeline[];
  driver?: DriverInfo;
  warehouse?: WarehouseInfo;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  customerLocation?: { lat: number; lng: number };
  driverLocation?: DriverLocation;
}

/** A single step in the delivery timeline */
export interface DeliveryStepTimeline {
  step: DeliveryStep;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  completedAt: string | null;
  isCurrent: boolean;
}

/** Driver information for tracking display */
export interface DriverInfo {
  id: string;
  nameEn: string;
  nameAr: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  rating: number;
  photoUrl?: string;
}

/** Warehouse information for tracking display */
export interface WarehouseInfo {
  id: string;
  nameEn: string;
  nameAr: string;
  address: string;
  phone: string;
}

/** Driver GPS location data */
export interface DriverLocation {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  lastUpdated: string;
}

/** Result of a driver assignment operation */
export interface AssignmentResult {
  success: boolean;
  driverId: string;
  driverName: string;
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
  reason: string;
}

/** Dispatcher dashboard overview data */
export interface DispatcherOverview {
  activeDeliveries: number;
  availableDrivers: number;
  pendingOrders: number;
  ordersBeingPacked: number;
  recentCompletions: number;
  averageDeliveryTime: number;
  deliveriesByStatus: Record<string, number>;
}

/** Scored driver candidate for auto-assignment */
export interface DriverCandidate {
  driverId: string;
  nameEn: string;
  nameAr: string;
  distance: number;
  rating: number;
  currentLoad: number;
  score: number;
}

/** Notification template for a delivery step */
export interface DeliveryNotificationTemplate {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  type: 'info' | 'order' | 'deal' | 'system';
}

/** Valid state transitions map — each step can only transition to specific next steps */
export const VALID_TRANSITIONS: Record<DeliveryStep, DeliveryStep[]> = {
  order_placed: ['order_confirmed', 'cancelled'],
  order_confirmed: ['being_packed', 'cancelled'],
  being_packed: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['driver_assigned', 'cancelled'],
  driver_assigned: ['driver_en_route', 'cancelled'],
  driver_en_route: ['driver_arrived_pickup', 'cancelled'],
  driver_arrived_pickup: ['picked_up', 'cancelled'],
  picked_up: ['driver_en_route_delivery', 'cancelled'],
  driver_en_route_delivery: ['driver_arrived_delivery', 'cancelled'],
  driver_arrived_delivery: ['delivered', 'delivery_failed', 'cancelled'],
  delivered: [],
  delivery_failed: [],
  cancelled: [],
};

/** Map from DeliveryStep to Order status string */
export const STEP_TO_ORDER_STATUS: Record<DeliveryStep, string> = {
  order_placed: 'pending',
  order_confirmed: 'confirmed',
  being_packed: 'processing',
  ready_for_pickup: 'packed',
  driver_assigned: 'packed',
  driver_en_route: 'packed',
  driver_arrived_pickup: 'packed',
  picked_up: 'out_for_delivery',
  driver_en_route_delivery: 'out_for_delivery',
  driver_arrived_delivery: 'out_for_delivery',
  delivered: 'delivered',
  delivery_failed: 'returned',
  cancelled: 'cancelled',
};

/** All delivery steps in display order */
export const DELIVERY_STEPS_ORDER: DeliveryStep[] = [
  'order_placed',
  'order_confirmed',
  'being_packed',
  'ready_for_pickup',
  'driver_assigned',
  'driver_en_route',
  'driver_arrived_pickup',
  'picked_up',
  'driver_en_route_delivery',
  'driver_arrived_delivery',
  'delivered',
];

/** Step labels in EN/AR */
export const STEP_LABELS: Record<DeliveryStep, { en: string; ar: string; descEn: string; descAr: string }> = {
  order_placed: { en: 'Order Placed', ar: 'تم الطلب', descEn: 'Your order has been placed', descAr: 'تم تقديم طلبك' },
  order_confirmed: { en: 'Order Confirmed', ar: 'تم التأكيد', descEn: 'Your order has been confirmed', descAr: 'تم تأكيد طلبك' },
  being_packed: { en: 'Being Packed', ar: 'جاري التجهيز', descEn: 'Your order is being packed at the warehouse', descAr: 'جاري تجهيز طلبك في المستودع' },
  ready_for_pickup: { en: 'Ready for Pickup', ar: 'جاهز للاستلام', descEn: 'Your order is ready for driver pickup', descAr: 'طلبك جاهز للاستلام من السائق' },
  driver_assigned: { en: 'Driver Assigned', ar: 'تم تعيين سائق', descEn: 'A driver has been assigned to your order', descAr: 'تم تعيين سائق لطلبك' },
  driver_en_route: { en: 'Driver En Route', ar: 'السائق في الطريق', descEn: 'The driver is heading to the warehouse', descAr: 'السائق متوجه للمستودع' },
  driver_arrived_pickup: { en: 'Driver at Warehouse', ar: 'السائق وصل المستودع', descEn: 'The driver has arrived at the warehouse', descAr: 'السائق وصل المستودع' },
  picked_up: { en: 'Picked Up', ar: 'تم الاستلام', descEn: 'The driver has picked up your order', descAr: 'السائق استلم طلبك' },
  driver_en_route_delivery: { en: 'Out for Delivery', ar: 'في الطريق إليك', descEn: 'Your order is on its way to you', descAr: 'طلبك في الطريق إليك' },
  driver_arrived_delivery: { en: 'Driver Arrived', ar: 'السائق وصل', descEn: 'The driver has arrived at your location', descAr: 'السائق وصل مكانك' },
  delivered: { en: 'Delivered', ar: 'تم التوصيل', descEn: 'Your order has been delivered', descAr: 'تم توصيل طلبك' },
  delivery_failed: { en: 'Delivery Failed', ar: 'فشل التوصيل', descEn: 'Delivery was unsuccessful', descAr: 'لم يتم التوصيل بنجاح' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', descEn: 'This order has been cancelled', descAr: 'تم إلغاء هذا الطلب' },
};

/**
 * Get the step label in the specified language
 */
export function getStepLabel(step: DeliveryStep, lang: Lang): string {
  const labels = STEP_LABELS[step];
  return lang === 'ar' ? labels.ar : labels.en;
}

/**
 * Get the step description in the specified language
 */
export function getStepDescription(step: DeliveryStep, lang: Lang): string {
  const labels = STEP_LABELS[step];
  return lang === 'ar' ? labels.descAr : labels.descEn;
}

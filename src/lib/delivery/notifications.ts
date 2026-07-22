// GGH Delivery Notifications — Bilingual notification templates for delivery steps
// Generates notification content for each delivery state change

import { db } from '@/lib/db';
import { type DeliveryStep, type DeliveryNotificationTemplate, STEP_LABELS } from './types';

/**
 * Notification templates for each delivery step.
 * Each template has bilingual title and body text.
 */
const NOTIFICATION_TEMPLATES: Record<DeliveryStep, DeliveryNotificationTemplate> = {
  order_placed: {
    titleEn: 'Order Placed',
    titleAr: 'تم الطلب',
    bodyEn: 'Your order has been placed successfully. We\'ll update you once it\'s confirmed.',
    bodyAr: 'تم تقديم طلبك بنجاح. هنبورك لما يتم التأكيد.',
    type: 'order',
  },
  order_confirmed: {
    titleEn: 'Order Confirmed',
    titleAr: 'تم التأكيد',
    bodyEn: 'Your order has been confirmed and will be packed shortly.',
    bodyAr: 'تم تأكيد طلبك وهيتجهز حالاً.',
    type: 'order',
  },
  being_packed: {
    titleEn: 'Being Packed',
    titleAr: 'جاري التجهيز',
    bodyEn: 'Your order is being packed at the warehouse.',
    bodyAr: 'طلبك بيتجهز دلوقتي في المستودع.',
    type: 'order',
  },
  ready_for_pickup: {
    titleEn: 'Ready for Pickup',
    titleAr: 'جاهز للاستلام',
    bodyEn: 'Your order is packed and ready for driver pickup.',
    bodyAr: 'طلبك متجهز وجاهز السائق يستلمه.',
    type: 'order',
  },
  driver_assigned: {
    titleEn: 'Driver Assigned',
    titleAr: 'تم تعيين سائق',
    bodyEn: 'A driver has been assigned to deliver your order.',
    bodyAr: 'تم تعيين سائق لتوصيل طلبك.',
    type: 'order',
  },
  driver_en_route: {
    titleEn: 'Driver En Route',
    titleAr: 'السائق في الطريق',
    bodyEn: 'Your driver is heading to the warehouse to pick up your order.',
    bodyAr: 'السائق رايح المستودع يستلم طلبك.',
    type: 'order',
  },
  driver_arrived_pickup: {
    titleEn: 'Driver at Warehouse',
    titleAr: 'السائق وصل المستودع',
    bodyEn: 'Your driver has arrived at the warehouse and is picking up your order.',
    bodyAr: 'السائق وصل المستودع واستلم طلبك.',
    type: 'order',
  },
  picked_up: {
    titleEn: 'Order Picked Up',
    titleAr: 'تم الاستلام',
    bodyEn: 'Your order has been picked up and is on its way to you!',
    bodyAr: 'السائق استلم طلبك وفي الطريق ليك!',
    type: 'order',
  },
  driver_en_route_delivery: {
    titleEn: 'Out for Delivery',
    titleAr: 'في الطريق ليك',
    bodyEn: 'Your order is out for delivery and heading your way!',
    bodyAr: 'طلبك في الطريق ليك!',
    type: 'order',
  },
  driver_arrived_delivery: {
    titleEn: 'Driver Arrived',
    titleAr: 'السائق وصل',
    bodyEn: 'Your driver has arrived at your location. Please come to receive your order.',
    bodyAr: 'السائق وصل مكانك. يلا استلم طلبك!',
    type: 'order',
  },
  delivered: {
    titleEn: 'Order Delivered',
    titleAr: 'تم التوصيل',
    bodyEn: 'Your order has been delivered successfully. Enjoy!',
    bodyAr: 'تم توصيل طلبك بنجاح. بالهنا!',
    type: 'order',
  },
  delivery_failed: {
    titleEn: 'Delivery Failed',
    titleAr: 'فشل التوصيل',
    bodyEn: 'We couldn\'t deliver your order. Please contact us for assistance.',
    bodyAr: 'لم نقدر نوصل طلبك. اتصل بينا عشان نساعدك.',
    type: 'order',
  },
  cancelled: {
    titleEn: 'Order Cancelled',
    titleAr: 'تم الإلغاء',
    bodyEn: 'Your order has been cancelled.',
    bodyAr: 'تم إلغاء طلبك.',
    type: 'order',
  },
};

/**
 * Get the notification template for a delivery step.
 *
 * @param step - The delivery step
 * @param lang - Language for the template
 * @returns The notification template with localized text
 */
export function getNotificationTemplate(
  step: DeliveryStep,
  lang: 'en' | 'ar'
): { title: string; body: string; type: string } {
  const template = NOTIFICATION_TEMPLATES[step];
  return {
    title: lang === 'ar' ? template.titleAr : template.titleEn,
    body: lang === 'ar' ? template.bodyAr : template.bodyEn,
    type: template.type,
  };
}

/**
 * Send a delivery notification for a step change.
 * Stores the notification in the Notification model for the customer.
 *
 * @param customerId - The customer ID to notify
 * @param step - The delivery step that triggered the notification
 * @param orderId - The order ID
 * @returns The created notification ID
 */
export async function sendDeliveryNotification(
  customerId: string,
  step: DeliveryStep,
  orderId: string
): Promise<string> {
  const template = NOTIFICATION_TEMPLATES[step];

  const notification = await db.notification.create({
    data: {
      customerId,
      titleEn: template.titleEn,
      titleAr: template.titleAr,
      bodyEn: template.bodyEn,
      bodyAr: template.bodyAr,
      type: template.type,
      actionUrl: `/orders/${orderId}`,
    },
  });

  return notification.id;
}

/**
 * Get all notification templates (for admin/reference use).
 *
 * @returns All notification templates indexed by step
 */
export function getAllNotificationTemplates(): Record<DeliveryStep, DeliveryNotificationTemplate> {
  return { ...NOTIFICATION_TEMPLATES };
}

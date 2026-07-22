// GGH Delivery — Get available delivery slots for a zone and date

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

interface DeliverySlotInfo {
  id: string;
  labelEn: string;
  labelAr: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Static delivery slots (time-based availability)
const DELIVERY_SLOTS: Omit<DeliverySlotInfo, 'id' | 'isAvailable'>[] = [
  { labelEn: 'Morning', labelAr: 'الصبح', startTime: '08:00', endTime: '12:00' },
  { labelEn: 'Afternoon', labelAr: 'بعد الظهر', startTime: '12:00', endTime: '16:00' },
  { labelEn: 'Evening', labelAr: 'المساء', startTime: '16:00', endTime: '20:00' },
  { labelEn: 'Late Night', labelAr: 'بالليل', startTime: '20:00', endTime: '23:00' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const date = searchParams.get('date');

    if (!zoneId) {
      return errorResponse('Zone ID is required', 'MISSING_ZONE_ID');
    }

    if (!date) {
      return errorResponse('Date is required', 'MISSING_DATE');
    }

    // Verify zone exists
    const zone = await db.deliveryZone.findFirst({
      where: { id: zoneId, isActive: true },
    });

    if (!zone) {
      return errorResponse('Delivery zone not found', 'ZONE_NOT_FOUND', 404);
    }

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    requestedDate.setHours(0, 0, 0, 0);

    // Only allow slots for today and future dates, up to 7 days ahead
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 7);

    if (requestedDate < today || requestedDate > maxDate) {
      return errorResponse('Date must be within the next 7 days', 'INVALID_DATE');
    }

    // Build slot availability
    const slots: DeliverySlotInfo[] = DELIVERY_SLOTS.map((slot, index) => {
      const now = new Date();
      const isToday = requestedDate.getTime() === today.getTime();

      // If today, mark past slots as unavailable
      let isAvailable = true;
      if (isToday) {
        const [hours] = slot.startTime.split(':').map(Number);
        if (now.getHours() >= hours + 1) {
          isAvailable = false;
        }
      }

      return {
        id: `slot-${index}`,
        labelEn: slot.labelEn,
        labelAr: slot.labelAr,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable,
      };
    });

    return successResponse({
      zone: {
        id: zone.id,
        nameEn: zone.nameEn,
        nameAr: zone.nameAr,
        area: zone.area,
        city: zone.city,
        deliveryFee: zone.deliveryFee,
        minOrder: zone.minOrder,
        estimatedHours: zone.estimatedHours,
      },
      date,
      slots,
    });
  } catch (err) {
    console.error('Delivery slots error:', err);
    return errorResponse('Failed to fetch delivery slots', 'DELIVERY_SLOTS_FAILED', 500);
  }
}

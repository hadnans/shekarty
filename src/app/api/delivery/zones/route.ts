// GGH Delivery — List delivery zones

import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function GET() {
  try {
    const zones = await db.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(zones);
  } catch (err) {
    console.error('Delivery zones error:', err);
    return errorResponse('Failed to fetch delivery zones', 'DELIVERY_ZONES_FAILED', 500);
  }
}

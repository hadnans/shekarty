// GGH Addresses — List addresses (GET) and Create address (POST)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;

    const addresses = await db.address.findMany({
      where: { customerId: customer.id, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return successResponse(addresses);
  } catch (err) {
    console.error('Addresses list error:', err);
    return errorResponse('Failed to fetch addresses', 'ADDRESSES_FETCH_FAILED', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const body = await request.json();
    const {
      label = 'home',
      addressLine1,
      addressLine2 = '',
      city = 'Cairo',
      area,
      buildingNo = '',
      floorNo = '',
      apartmentNo = '',
      landmark = '',
      latitude,
      longitude,
      deliveryZone = '',
      isDefault = false,
      deliveryInstructions = '',
    } = body;

    if (!addressLine1) {
      return errorResponse('Address line 1 is required', 'MISSING_ADDRESS_LINE1');
    }

    if (!area) {
      return errorResponse('Area is required', 'MISSING_AREA');
    }

    // If this is set as default, unset any existing default
    if (isDefault) {
      await db.address.updateMany({
        where: { customerId: customer.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first address, make it default
    const addressCount = await db.address.count({
      where: { customerId: customer.id, deletedAt: null },
    });

    const address = await db.address.create({
      data: {
        customerId: customer.id,
        label,
        addressLine1,
        addressLine2,
        city,
        area,
        buildingNo,
        floorNo,
        apartmentNo,
        landmark,
        latitude: latitude ? parseFloat(String(latitude)) : null,
        longitude: longitude ? parseFloat(String(longitude)) : null,
        deliveryZone,
        isDefault: isDefault || addressCount === 0,
        deliveryInstructions,
      },
    });

    return successResponse(address, 'Address created successfully');
  } catch (err) {
    console.error('Address create error:', err);
    return errorResponse('Failed to create address', 'ADDRESS_CREATE_FAILED', 500);
  }
}

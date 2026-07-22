// GGH Addresses — Update address (PATCH) and Delete address (DELETE)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const { id } = await params;
    const body = await request.json();

    // Verify address belongs to customer
    const existing = await db.address.findFirst({
      where: { id, customerId: customer.id, deletedAt: null },
    });

    if (!existing) {
      return errorResponse('Address not found', 'ADDRESS_NOT_FOUND', 404);
    }

    const {
      label,
      addressLine1,
      addressLine2,
      city,
      area,
      buildingNo,
      floorNo,
      apartmentNo,
      landmark,
      latitude,
      longitude,
      deliveryZone,
      isDefault,
      deliveryInstructions,
    } = body;

    // If setting as default, unset existing defaults
    if (isDefault && !existing.isDefault) {
      await db.address.updateMany({
        where: { customerId: customer.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (city !== undefined) updateData.city = city;
    if (area !== undefined) updateData.area = area;
    if (buildingNo !== undefined) updateData.buildingNo = buildingNo;
    if (floorNo !== undefined) updateData.floorNo = floorNo;
    if (apartmentNo !== undefined) updateData.apartmentNo = apartmentNo;
    if (landmark !== undefined) updateData.landmark = landmark;
    if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(String(latitude)) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(String(longitude)) : null;
    if (deliveryZone !== undefined) updateData.deliveryZone = deliveryZone;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (deliveryInstructions !== undefined) updateData.deliveryInstructions = deliveryInstructions;

    const address = await db.address.update({
      where: { id },
      data: updateData,
    });

    return successResponse(address, 'Address updated successfully');
  } catch (err) {
    console.error('Address update error:', err);
    return errorResponse('Failed to update address', 'ADDRESS_UPDATE_FAILED', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const { id } = await params;

    // Verify address belongs to customer
    const existing = await db.address.findFirst({
      where: { id, customerId: customer.id, deletedAt: null },
    });

    if (!existing) {
      return errorResponse('Address not found', 'ADDRESS_NOT_FOUND', 404);
    }

    // Soft delete
    await db.address.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // If this was the default address, set another as default
    if (existing.isDefault) {
      const nextDefault = await db.address.findFirst({
        where: { customerId: customer.id, deletedAt: null, id: { not: id } },
        orderBy: { createdAt: 'desc' },
      });
      if (nextDefault) {
        await db.address.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    return successResponse({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Address delete error:', err);
    return errorResponse('Failed to delete address', 'ADDRESS_DELETE_FAILED', 500);
  }
}

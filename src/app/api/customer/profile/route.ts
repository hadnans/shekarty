// GGH Customer — Profile (GET and PATCH)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;

    const profile = await db.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        nameAr: true,
        preferredLang: true,
        wholesaleStatus: true,
        isVerified: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return errorResponse('Profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    return successResponse(profile);
  } catch (err) {
    console.error('Profile fetch error:', err);
    return errorResponse('Failed to fetch profile', 'PROFILE_FETCH_FAILED', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const body = await request.json();

    const allowedFields = ['firstName', 'lastName', 'nameAr', 'email', 'preferredLang'];
    const updateData: Record<string, string> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update', 'NO_FIELDS_TO_UPDATE');
    }

    const updated = await db.customer.update({
      where: { id: customer.id },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        nameAr: true,
        preferredLang: true,
        wholesaleStatus: true,
        isVerified: true,
        avatarUrl: true,
      },
    });

    return successResponse(updated, 'Profile updated successfully');
  } catch (err) {
    console.error('Profile update error:', err);
    return errorResponse('Failed to update profile', 'PROFILE_UPDATE_FAILED', 500);
  }
}

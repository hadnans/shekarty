// GGH — Single Geofence API Route
// GET /api/location/geofences/[id] — Get a single geofence
// PUT /api/location/geofences/[id] — Update a geofence
// DELETE /api/location/geofences/[id] — Soft-delete (deactivate) a geofence

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { prismaToGeofence } from '@/lib/location/geofencing';

/** Schema for updating a geofence */
const updateGeofenceSchema = z.object({
  nameEn: z.string().min(1).max(200).optional(),
  nameAr: z.string().min(1).max(200).optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radius: z.number().positive().max(100000).optional(),
  points: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).min(3).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/location/geofences/[id]
 * Get a single geofence by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const geofence = await db.geofence.findUnique({ where: { id } });

    if (!geofence) {
      return NextResponse.json(
        { success: false, error: 'Geofence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: prismaToGeofence(geofence),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get geofence';
    console.error('[GGH Geofence API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/location/geofences/[id]
 * Update a geofence.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.geofence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Geofence not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateGeofenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Handle center/radius updates for circle geofences
    if (data.centerLat !== undefined) updateData.centerLat = data.centerLat;
    if (data.centerLng !== undefined) updateData.centerLng = data.centerLng;
    if (data.radius !== undefined) updateData.radius = data.radius;

    // Handle points update for polygon geofences
    if (data.points !== undefined) updateData.points = JSON.stringify(data.points);

    // Handle metadata update
    if (data.metadata !== undefined) {
      updateData.metadata = JSON.stringify(data.metadata);
    }

    const updated = await db.geofence.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: prismaToGeofence(updated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update geofence';
    console.error('[GGH Geofence API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/location/geofences/[id]
 * Soft-delete a geofence by setting isActive to false.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.geofence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Geofence not found' },
        { status: 404 }
      );
    }

    const updated = await db.geofence.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      data: prismaToGeofence(updated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete geofence';
    console.error('[GGH Geofence API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// GGH — Geofences API Route
// GET /api/location/geofences — List all geofences
// POST /api/location/geofences — Create a geofence

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { prismaToGeofence, geofenceToPrisma } from '@/lib/location/geofencing';
import type { Geofence } from '@/lib/location/types';

/** Schema for creating a circle geofence */
const circleGeofenceSchema = z.object({
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().min(1).max(200),
  type: z.literal('circle'),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radius: z.number().positive().max(100000), // max 100km radius
  metadata: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

/** Schema for creating a polygon geofence */
const polygonGeofenceSchema = z.object({
  nameEn: z.string().min(1).max(200),
  nameAr: z.string().min(1).max(200),
  type: z.literal('polygon'),
  points: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).min(3),
  metadata: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

/** Combined schema for geofence creation */
const createGeofenceSchema = z.discriminatedUnion('type', [
  circleGeofenceSchema,
  polygonGeofenceSchema,
]);

/**
 * GET /api/location/geofences
 * List all geofences, optionally filtered by active status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get('active') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const geofences = await db.geofence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const results: Geofence[] = geofences.map(prismaToGeofence);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list geofences';
    console.error('[GGH Geofences API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/location/geofences
 * Create a new geofence (circle or polygon).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGeofenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build geofence domain object
    const geofenceData: Omit<Geofence, 'id'> = {
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      type: data.type,
      isActive: data.isActive,
      metadata: data.metadata,
    };

    if (data.type === 'circle') {
      geofenceData.center = { lat: data.centerLat, lng: data.centerLng };
      geofenceData.radius = data.radius;
    } else {
      geofenceData.points = data.points;
    }

    // Convert and persist
    const prismaData = geofenceToPrisma(geofenceData);
    const created = await db.geofence.create({ data: prismaData });

    return NextResponse.json({
      success: true,
      data: prismaToGeofence(created),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create geofence';
    console.error('[GGH Geofences API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// GGH — GPS Tracking API Route
// GET /api/location/track?driverId=... — Get driver's current position
// POST /api/location/track — Update position

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPosition, updatePosition, getNearbyDrivers } from '@/lib/location/gps-tracking';

/** Schema for GPS position update */
const gpsPositionSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.enum(['driver', 'vehicle']),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  heading: z.number().min(0).max(360).default(0),
  speed: z.number().min(0).default(0),
  accuracy: z.number().min(0).default(0),
  batteryLevel: z.number().min(0).max(100).optional(),
  timestamp: z.string().min(1),
});

/** Schema for query parameters */
const trackQuerySchema = z.object({
  driverId: z.string().optional(),
  nearbyLat: z.string().transform((v) => parseFloat(v)).optional(),
  nearbyLng: z.string().transform((v) => parseFloat(v)).optional(),
  nearbyRadius: z.string().transform((v) => parseInt(v, 10)).optional(),
});

/**
 * GET /api/location/track
 * Get a driver's current position or find nearby drivers.
 * ?driverId=xxx — Get specific driver position
 * ?nearbyLat=30.0444&nearbyLng=31.2357&nearbyRadius=5000 — Find nearby drivers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = trackQuerySchema.safeParse({
      driverId: searchParams.get('driverId') ?? undefined,
      nearbyLat: searchParams.get('nearbyLat') ?? undefined,
      nearbyLng: searchParams.get('nearbyLng') ?? undefined,
      nearbyRadius: searchParams.get('nearbyRadius') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { driverId, nearbyLat, nearbyLng, nearbyRadius } = parsed.data;

    // Get specific driver position
    if (driverId) {
      const position = await getPosition(driverId);
      if (!position) {
        return NextResponse.json(
          { success: false, error: 'No position found for this driver' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: position });
    }

    // Find nearby drivers
    if (nearbyLat !== undefined && nearbyLng !== undefined) {
      const radius = nearbyRadius ?? 5000; // default 5km radius
      const nearby = await getNearbyDrivers(
        { lat: nearbyLat, lng: nearbyLng },
        radius
      );
      return NextResponse.json({
        success: true,
        data: nearby,
        meta: { center: { lat: nearbyLat, lng: nearbyLng }, radius },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide "driverId" or "nearbyLat" & "nearbyLng" parameters' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tracking query failed';
    console.error('[GGH Track API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/location/track
 * Update a GPS position for a driver or vehicle.
 * Body: GpsPosition object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = gpsPositionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const position = parsed.data;
    await updatePosition(position);

    return NextResponse.json({
      success: true,
      data: position,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Position update failed';
    console.error('[GGH Track API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

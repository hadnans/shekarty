// GGH — Route Calculation API Route
// POST /api/location/route — Calculate route between points

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRoute, getMultiStopRoute } from '@/lib/location/routing';

/** Schema for LatLng coordinate */
const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Schema for route calculation request body */
const routeRequestSchema = z.object({
  origin: latLngSchema,
  destination: latLngSchema,
  waypoints: z.array(latLngSchema).optional(),
});

/**
 * POST /api/location/route
 * Body: { origin: { lat, lng }, destination: { lat, lng }, waypoints?: [{ lat, lng }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = routeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { origin, destination, waypoints } = parsed.data;

    let result;
    if (waypoints && waypoints.length > 0) {
      result = await getMultiStopRoute([origin, ...waypoints, destination]);
    } else {
      result = await getRoute(origin, destination);
    }

    return NextResponse.json({
      success: true,
      data: {
        distance: result.distance,
        duration: result.duration,
        polyline: result.polyline,
        steps: result.steps,
        waypoints: result.waypoints,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route calculation failed';
    console.error('[GGH Route API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

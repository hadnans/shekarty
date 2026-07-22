// GGH — Route Optimization API Route
// POST /api/location/optimize-route — Optimize multi-stop route

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { optimizeRoute } from '@/lib/location/route-optimization';

/** Schema for LatLng coordinate */
const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Schema for a stop in the optimization request */
const stopSchema = z.object({
  id: z.string().min(1),
  location: latLngSchema,
  type: z.enum(['delivery', 'pickup']),
  timeWindow: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }).optional(),
  serviceTime: z.number().min(0).max(120).optional(), // minutes
});

/** Schema for route optimization request body */
const optimizeRouteRequestSchema = z.object({
  start: latLngSchema,
  stops: z.array(stopSchema).min(1).max(50),
  end: latLngSchema.optional(),
  optimizeFor: z.enum(['distance', 'time']).default('distance'),
});

/**
 * POST /api/location/optimize-route
 * Optimize the order of stops for a delivery/pickup route.
 * Body: RouteOptimizationRequest
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = optimizeRouteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await optimizeRoute(parsed.data);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route optimization failed';
    console.error('[GGH Optimize Route API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

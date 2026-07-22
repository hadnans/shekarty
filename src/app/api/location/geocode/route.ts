// GGH — Geocode API Route
// GET /api/location/geocode?address=... — Forward geocode
// GET /api/location/geocode?lat=...&lng=... — Reverse geocode

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { geocodeAddress, reverseGeocode } from '@/lib/location/geocoding';

/** Schema for forward geocoding query parameters */
const forwardGeocodeSchema = z.object({
  address: z.string().min(1).max(500),
  lang: z.enum(['en', 'ar']).optional().default('en'),
});

/** Schema for reverse geocoding query parameters */
const reverseGeocodeSchema = z.object({
  lat: z.string().transform((val) => parseFloat(val)),
  lng: z.string().transform((val) => parseFloat(val)),
  lang: z.enum(['en', 'ar']).optional().default('en'),
});

/**
 * GET /api/location/geocode
 * Forward geocode: ?address=123+Main+St&lang=en
 * Reverse geocode: ?lat=30.0444&lng=31.2357&lang=en
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const address = searchParams.get('address');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Forward geocode
    if (address) {
      const parsed = forwardGeocodeSchema.safeParse({
        address,
        lang: searchParams.get('lang') ?? 'en',
      });

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid parameters', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const results = await geocodeAddress(parsed.data.address, parsed.data.lang);
      return NextResponse.json({ success: true, data: results });
    }

    // Reverse geocode
    if (lat && lng) {
      const parsed = reverseGeocodeSchema.safeParse({
        lat,
        lng,
        lang: searchParams.get('lang') ?? 'en',
      });

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid parameters', details: parsed.error.issues },
          { status: 400 }
        );
      }

      const results = await reverseGeocode(
        { lat: parsed.data.lat, lng: parsed.data.lng },
        parsed.data.lang
      );
      return NextResponse.json({ success: true, data: results });
    }

    // Neither provided
    return NextResponse.json(
      { success: false, error: 'Provide either "address" for forward geocoding or "lat" & "lng" for reverse geocoding' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Geocoding failed';
    console.error('[GGH Geocode API]', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

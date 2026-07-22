// GGH — Mapbox Map Provider
// Uses Mapbox Geocoding API + Directions API
// Requires MAPBOX_API_KEY environment variable

import type { LatLng, LatLngBounds, GeocodeResult, RouteResult } from '../types';
import type { MapProvider } from './interface';

/**
 * Mapbox provider using Geocoding API and Directions API.
 * Requires MAPBOX_API_KEY to be set in environment.
 */
export class MapboxProvider implements MapProvider {
  readonly name = 'mapbox' as const;
  private readonly apiKey: string;

  constructor() {
    const key = process.env.MAPBOX_API_KEY;
    if (!key) {
      throw new Error('MAPBOX_API_KEY is required for Mapbox provider');
    }
    this.apiKey = key;
  }

  /**
   * Forward geocode using Mapbox Geocoding API.
   * @param address - Address string to geocode
   * @param bounds - Optional bounding box for biasing results
   * @returns Array of geocoding results
   */
  async geocode(address: string, bounds?: LatLngBounds): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      access_token: this.apiKey,
      limit: '5',
    });

    if (bounds) {
      params.set('bbox', `${bounds.sw.lng},${bounds.sw.lat},${bounds.ne.lng},${bounds.ne.lat}`);
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Mapbox geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      features: Array<{
        id: string;
        place_name: string;
        center: [number, number];
        place_type: string[];
        text: string;
        context?: Array<{ id: string; text: string; short_code?: string }>;
      }>;
    };

    return data.features.map((feature): GeocodeResult => {
      const ctx = feature.context ?? [];
      const getContext = (prefix: string): string | undefined =>
        ctx.find((c) => c.id.startsWith(prefix))?.text;

      return {
        formattedAddress: feature.place_name,
        location: {
          lng: feature.center[0],
          lat: feature.center[1],
        },
        placeId: feature.id,
        types: feature.place_type,
        components: {
          city: getContext('place') || getContext('locality'),
          area: getContext('region') || getContext('district'),
          street: feature.place_type.includes('address') ? feature.text : undefined,
          country: getContext('country'),
        },
      };
    });
  }

  /**
   * Reverse geocode using Mapbox Geocoding API.
   * @param location - Coordinates to reverse geocode
   * @returns Array of geocoding results
   */
  async reverseGeocode(location: LatLng): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      access_token: this.apiKey,
      limit: '5',
    });

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Mapbox reverse geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      features: Array<{
        id: string;
        place_name: string;
        center: [number, number];
        place_type: string[];
        text: string;
        context?: Array<{ id: string; text: string }>;
      }>;
    };

    return data.features.map((feature): GeocodeResult => {
      const ctx = feature.context ?? [];
      const getContext = (prefix: string): string | undefined =>
        ctx.find((c) => c.id.startsWith(prefix))?.text;

      return {
        formattedAddress: feature.place_name,
        location: {
          lng: feature.center[0],
          lat: feature.center[1],
        },
        placeId: feature.id,
        types: feature.place_type,
        components: {
          city: getContext('place') || getContext('locality'),
          area: getContext('region') || getContext('district'),
          street: feature.place_type.includes('address') ? feature.text : undefined,
          country: getContext('country'),
        },
      };
    });
  }

  /**
   * Calculate route using Mapbox Directions API.
   * @param origin - Starting point
   * @param destination - Ending point
   * @param waypoints - Optional intermediate stops
   * @returns Route result with distance, duration, steps, and polyline
   */
  async getRoute(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<RouteResult> {
    const allPoints = [origin, ...(waypoints ?? []), destination];
    const coords = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');

    const params = new URLSearchParams({
      access_token: this.apiKey,
      overview: 'full',
      geometries: 'geojson',
      steps: 'true',
    });

    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Mapbox Directions failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      code: string;
      routes: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: Array<[number, number]> };
        legs: Array<{
          steps: Array<{
            maneuver: { instruction: string; location: [number, number] };
            distance: number;
            duration: number;
            geometry: { coordinates: Array<[number, number]> };
          }>;
        }>;
      }>;
    };

    if (data.code !== 'Ok' || data.routes.length === 0) {
      throw new Error(`Mapbox Directions returned no routes`);
    }

    const route = data.routes[0];
    const steps: RouteResult['steps'] = [];

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const coords = step.geometry.coordinates;
        steps.push({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
          startLocation: {
            lng: step.maneuver.location[0],
            lat: step.maneuver.location[1],
          },
          endLocation: {
            lng: coords[coords.length - 1][0],
            lat: coords[coords.length - 1][1],
          },
        });
      }
    }

    return {
      distance: route.distance,
      duration: route.duration,
      polyline: JSON.stringify(route.geometry),
      steps,
      waypoints: allPoints,
    };
  }

  /**
   * Calculate distance matrix using Mapbox Directions API (batch requests).
   * Note: Mapbox doesn't have a dedicated distance matrix API, so we make individual requests.
   * @param origins - Array of origin coordinates
   * @param destinations - Array of destination coordinates
   * @returns 2D array of distances in meters
   */
  async getDistanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    const matrix: number[][] = [];

    for (const origin of origins) {
      const row: number[] = [];
      for (const dest of destinations) {
        try {
          const route = await this.getRoute(origin, dest);
          row.push(route.distance);
        } catch {
          row.push(Infinity);
        }
      }
      matrix.push(row);
    }

    return matrix;
  }

  /**
   * Get the Mapbox tile URL template for frontend map rendering.
   * @returns Tile URL template with {x}, {y}, {z} placeholders
   */
  getTileUrl(): string {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=${this.apiKey}`;
  }
}

// GGH — HERE Maps Provider
// Uses HERE Geocoder API + Routing API
// Requires HERE_MAPS_API_KEY environment variable

import type { LatLng, LatLngBounds, GeocodeResult, RouteResult } from '../types';
import type { MapProvider } from './interface';

/**
 * HERE Maps provider using Geocoder API and Routing API.
 * Requires HERE_MAPS_API_KEY to be set in environment.
 */
export class HereMapsProvider implements MapProvider {
  readonly name = 'here' as const;
  private readonly apiKey: string;

  constructor() {
    const key = process.env.HERE_MAPS_API_KEY;
    if (!key) {
      throw new Error('HERE_MAPS_API_KEY is required for HERE Maps provider');
    }
    this.apiKey = key;
  }

  /**
   * Forward geocode using HERE Geocoder API.
   * @param address - Address string to geocode
   * @param bounds - Optional bounding box for biasing results
   * @returns Array of geocoding results
   */
  async geocode(address: string, bounds?: LatLngBounds): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      q: address,
      apiKey: this.apiKey,
      limit: '5',
    });

    if (bounds) {
      params.set('mapView', `${bounds.sw.lat},${bounds.sw.lng},${bounds.ne.lat},${bounds.ne.lng}`);
    }

    const response = await fetch(
      `https://geocode.search.hereapi.com/v1/geocode?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HERE geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      items: Array<{
        id: string;
        address: {
          label: string;
          city?: string;
          state?: string;
          street?: string;
          houseNumber?: string;
          countryName?: string;
        };
        position: { lat: number; lng: number };
        resultType: string;
      }>;
    };

    return data.items.map((item): GeocodeResult => ({
      formattedAddress: item.address.label,
      location: {
        lat: item.position.lat,
        lng: item.position.lng,
      },
      placeId: item.id,
      types: [item.resultType],
      components: {
        city: item.address.city,
        area: item.address.state,
        street: item.address.street,
        building: item.address.houseNumber,
        country: item.address.countryName,
      },
    }));
  }

  /**
   * Reverse geocode using HERE Geocoder API.
   * @param location - Coordinates to reverse geocode
   * @returns Array of geocoding results
   */
  async reverseGeocode(location: LatLng): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      at: `${location.lat},${location.lng}`,
      apiKey: this.apiKey,
      limit: '5',
    });

    const response = await fetch(
      `https://revgeocode.search.hereapi.com/v1/revgeocode?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HERE reverse geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      items: Array<{
        id: string;
        address: {
          label: string;
          city?: string;
          state?: string;
          street?: string;
          houseNumber?: string;
          countryName?: string;
        };
        position: { lat: number; lng: number };
        resultType: string;
      }>;
    };

    return data.items.map((item): GeocodeResult => ({
      formattedAddress: item.address.label,
      location: {
        lat: item.position.lat,
        lng: item.position.lng,
      },
      placeId: item.id,
      types: [item.resultType],
      components: {
        city: item.address.city,
        area: item.address.state,
        street: item.address.street,
        building: item.address.houseNumber,
        country: item.address.countryName,
      },
    }));
  }

  /**
   * Calculate route using HERE Routing API.
   * @param origin - Starting point
   * @param destination - Ending point
   * @param waypoints - Optional intermediate stops
   * @returns Route result with distance, duration, steps, and polyline
   */
  async getRoute(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<RouteResult> {
    const allPoints = [origin, ...(waypoints ?? []), destination];

    const viaParams = waypoints
      ? waypoints.map((w) => `&via=${w.lat},${w.lng}`).join('')
      : '';

    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      apiKey: this.apiKey,
      transportMode: 'car',
      return: 'polyline,turnbyturnactions,summary',
    });

    const response = await fetch(
      `https://router.hereapi.com/v8/routes?${params.toString()}${viaParams}`
    );

    if (!response.ok) {
      throw new Error(`HERE Routing failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      routes: Array<{
        sections: Array<{
          summary: { length: number; duration: number };
          polyline: string;
          turnByTurnActions: Array<{
            action: string;
            duration: number;
            length: number;
            offset: number;
            instruction: string;
          }>;
        }>;
      }>;
    };

    if (data.routes.length === 0) {
      throw new Error('HERE Routing returned no routes');
    }

    const route = data.routes[0];
    const totalDistance = route.sections.reduce((sum, s) => sum + s.summary.length, 0);
    const totalDuration = route.sections.reduce((sum, s) => sum + s.summary.duration, 0);

    const steps: RouteResult['steps'] = [];
    let currentLocation = origin;

    for (const section of route.sections) {
      for (const action of section.turnByTurnActions ?? []) {
        steps.push({
          instruction: action.instruction || action.action,
          distance: action.length,
          duration: action.duration,
          startLocation: currentLocation,
          endLocation: currentLocation, // HERE doesn't provide per-step coords in this format
        });
      }
    }

    return {
      distance: totalDistance,
      duration: totalDuration,
      polyline: route.sections.map((s) => s.polyline).join('|'),
      steps,
      waypoints: allPoints,
    };
  }

  /**
   * Calculate distance matrix using HERE Routing API (batch requests).
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
   * Get the HERE Maps tile URL template for frontend map rendering.
   * @returns Tile URL template with {x}, {y}, {z} placeholders
   */
  getTileUrl(): string {
    return `https://2.base.maps.ls.hereapi.com/maptile/2.1/maptile/newest/normal.day/256/{z}/{x}/{y}/png8?apiKey=${this.apiKey}`;
  }
}

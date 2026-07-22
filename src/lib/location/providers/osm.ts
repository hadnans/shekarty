// GGH — OpenStreetMap Map Provider
// Uses Nominatim for geocoding and OSRM for routing
// Free, no API key needed — the default provider

import type { LatLng, LatLngBounds, GeocodeResult, RouteResult } from '../types';
import type { MapProvider } from './interface';

/** Rate limiter: ensures minimum delay between requests (Nominatim policy: 1 req/sec) */
class RateLimiter {
  private lastCall = 0;
  private readonly minInterval: number;

  constructor(minIntervalMs: number = 1100) {
    this.minInterval = minIntervalMs;
  }

  /** Wait until enough time has passed since the last request */
  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < this.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastCall = Date.now();
  }
}

const nominatimLimiter = new RateLimiter(1100);
const osrmLimiter = new RateLimiter(500);

/**
 * OpenStreetMap provider using Nominatim (geocoding) and OSRM (routing).
 * Free to use, no API key required. Respects Nominatim usage policy (1 req/sec).
 */
export class OsmProvider implements MapProvider {
  readonly name = 'osm' as const;

  private readonly nominatimBase = 'https://nominatim.openstreetmap.org';
  private readonly osrmBase = 'https://router.project-osrm.org';

  /**
   * Forward geocode using Nominatim.
   * @param address - Address string to geocode
   * @param bounds - Optional bounding box for biasing results
   * @returns Array of geocoding results
   */
  async geocode(address: string, bounds?: LatLngBounds): Promise<GeocodeResult[]> {
    await nominatimLimiter.wait();

    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      'accept-language': 'en,ar',
    });

    if (bounds) {
      params.set('viewbox', `${bounds.sw.lng},${bounds.ne.lat},${bounds.ne.lng},${bounds.sw.lat}`);
      params.set('bounded', '0'); // prefer but don't restrict
    }

    const response = await fetch(`${this.nominatimBase}/search?${params.toString()}`, {
      headers: { 'User-Agent': 'GGH-LocationService/1.0' },
    });

    if (!response.ok) {
      throw new Error(`Nominatim geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as Array<{
      place_id: string;
      display_name: string;
      lat: string;
      lon: string;
      type: string;
      address?: {
        city?: string;
        state?: string;
        suburb?: string;
        road?: string;
        house_number?: string;
        country?: string;
        country_code?: string;
      };
    }>;

    return data.map((item): GeocodeResult => ({
      formattedAddress: item.display_name,
      location: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
      placeId: item.place_id,
      types: [item.type],
      components: {
        city: item.address?.city,
        area: item.address?.suburb || item.address?.state,
        street: item.address?.road,
        building: item.address?.house_number,
        country: item.address?.country,
      },
    }));
  }

  /**
   * Reverse geocode using Nominatim.
   * @param location - Coordinates to reverse geocode
   * @returns Array of geocoding results
   */
  async reverseGeocode(location: LatLng): Promise<GeocodeResult[]> {
    await nominatimLimiter.wait();

    const params = new URLSearchParams({
      lat: location.lat.toString(),
      lon: location.lng.toString(),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'en,ar',
    });

    const response = await fetch(`${this.nominatimBase}/reverse?${params.toString()}`, {
      headers: { 'User-Agent': 'GGH-LocationService/1.0' },
    });

    if (!response.ok) {
      throw new Error(`Nominatim reverse geocoding failed: ${response.status} ${response.statusText}`);
    }

    const item = await response.json() as {
      place_id: string;
      display_name: string;
      lat: string;
      lon: string;
      type: string;
      address?: {
        city?: string;
        state?: string;
        suburb?: string;
        road?: string;
        house_number?: string;
        country?: string;
      };
      error?: string;
    };

    if (item.error) {
      return [];
    }

    return [{
      formattedAddress: item.display_name,
      location: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
      placeId: item.place_id,
      types: [item.type],
      components: {
        city: item.address?.city,
        area: item.address?.suburb || item.address?.state,
        street: item.address?.road,
        building: item.address?.house_number,
        country: item.address?.country,
      },
    }];
  }

  /**
   * Calculate route using OSRM (Open Source Routing Machine).
   * @param origin - Starting point
   * @param destination - Ending point
   * @param waypoints - Optional intermediate stops
   * @returns Route result with distance, duration, steps, and polyline
   */
  async getRoute(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<RouteResult> {
    await osrmLimiter.wait();

    const allPoints = [origin, ...(waypoints ?? []), destination];
    const coords = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');

    const url = `${this.osrmBase}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'GGH-LocationService/1.0' },
    });

    if (!response.ok) {
      throw new Error(`OSRM routing failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      code: string;
      routes: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: Array<[number, number]> };
        legs: Array<{
          steps: Array<{
            maneuver: { type: string; modifier?: string };
            name: string;
            distance: number;
            duration: number;
            geometry: { coordinates: Array<[number, number]> };
          }>;
        }>;
      }>;
    };

    if (data.code !== 'Ok' || data.routes.length === 0) {
      throw new Error(`OSRM routing returned no routes`);
    }

    const route = data.routes[0];
    const steps: RouteResult['steps'] = [];

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const coords = step.geometry.coordinates;
        steps.push({
          instruction: this.formatInstruction(step.maneuver.type, step.maneuver.modifier, step.name),
          distance: step.distance,
          duration: step.duration,
          startLocation: { lat: coords[0][1], lng: coords[0][0] },
          endLocation: { lat: coords[coords.length - 1][1], lng: coords[coords.length - 1][0] },
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
   * Calculate distance matrix using OSRM table service.
   * @param origins - Array of origin coordinates
   * @param destinations - Array of destination coordinates
   * @returns 2D array of distances in meters
   */
  async getDistanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    await osrmLimiter.wait();

    const allCoords = [...origins, ...destinations];
    const coordsStr = allCoords.map((p) => `${p.lng},${p.lat}`).join(';');

    const originIndices = origins.map((_, i) => i).join(';');
    const destIndices = destinations.map((_, i) => i + origins.length).join(';');

    const url = `${this.osrmBase}/table/v1/driving/${coordsStr}?distances=1&origins=${originIndices}&destinations=${destIndices}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'GGH-LocationService/1.0' },
    });

    if (!response.ok) {
      throw new Error(`OSRM distance matrix failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      code: string;
      distances: Array<Array<number | null>>;
    };

    if (data.code !== 'Ok') {
      throw new Error(`OSRM distance matrix returned error`);
    }

    // Replace null values with Infinity
    return data.distances.map((row) =>
      row.map((val) => (val === null ? Infinity : val))
    );
  }

  /**
   * Get the OpenStreetMap tile URL template for frontend map rendering.
   * @returns Tile URL template with {x}, {y}, {z} placeholders
   */
  getTileUrl(): string {
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }

  /**
   * Format an OSRM maneuver into a human-readable instruction.
   * @param type - Maneuver type (turn, depart, arrive, etc.)
   * @param modifier - Maneuver modifier (left, right, straight, etc.)
   * @param name - Road name
   * @returns Formatted instruction string
   */
  private formatInstruction(type: string, modifier?: string, name?: string): string {
    const road = name ? ` on ${name}` : '';
    switch (type) {
      case 'depart':
        return `Head ${modifier || 'north'}${road}`;
      case 'arrive':
        return `Arrive at destination${road}`;
      case 'turn':
        return `Turn ${modifier || ''}${road}`;
      case 'new name':
        return `Continue${road}`;
      case 'merge':
        return `Merge ${modifier || ''}${road}`;
      case 'fork':
        return `Take the ${modifier || ''} fork${road}`;
      case 'roundabout':
        return `Enter roundabout${road}`;
      case 'rotary':
        return `Enter rotary${road}`;
      case 'end of road':
        return `Turn ${modifier || 'right'}${road}`;
      case 'continue':
        return `Continue ${modifier || ''}${road}`;
      default:
        return `${type}${road}`;
    }
  }
}

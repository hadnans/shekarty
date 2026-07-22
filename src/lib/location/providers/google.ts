// GGH — Google Maps Provider
// Uses Google Maps Geocoding API + Directions API
// Requires GOOGLE_MAPS_API_KEY environment variable

import type { LatLng, LatLngBounds, GeocodeResult, RouteResult } from '../types';
import type { MapProvider } from './interface';

/**
 * Google Maps provider using Geocoding API and Directions API.
 * Requires GOOGLE_MAPS_API_KEY to be set in environment.
 */
export class GoogleMapsProvider implements MapProvider {
  readonly name = 'google' as const;
  private readonly apiKey: string;

  constructor() {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_MAPS_API_KEY is required for Google Maps provider');
    }
    this.apiKey = key;
  }

  /**
   * Forward geocode using Google Maps Geocoding API.
   * @param address - Address string to geocode
   * @param bounds - Optional bounding box for biasing results
   * @returns Array of geocoding results
   */
  async geocode(address: string, bounds?: LatLngBounds): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      address,
      key: this.apiKey,
    });

    if (bounds) {
      params.set('bounds', `${bounds.sw.lat},${bounds.sw.lng}|${bounds.ne.lat},${bounds.ne.lng}`);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Google geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      status: string;
      results: Array<{
        place_id: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        types: string[];
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }>;
    };

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google geocoding error: ${data.status}`);
    }

    return data.results.map((item): GeocodeResult => {
      const getComponent = (...types: string[]): string | undefined =>
        item.address_components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

      return {
        formattedAddress: item.formatted_address,
        location: {
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
        },
        placeId: item.place_id,
        types: item.types,
        components: {
          city: getComponent('locality', 'administrative_area_level_2'),
          area: getComponent('sublocality', 'administrative_area_level_1'),
          street: getComponent('route'),
          building: getComponent('street_number'),
          country: getComponent('country'),
        },
      };
    });
  }

  /**
   * Reverse geocode using Google Maps Geocoding API.
   * @param location - Coordinates to reverse geocode
   * @returns Array of geocoding results
   */
  async reverseGeocode(location: LatLng): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      latlng: `${location.lat},${location.lng}`,
      key: this.apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Google reverse geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      status: string;
      results: Array<{
        place_id: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        types: string[];
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }>;
    };

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google reverse geocoding error: ${data.status}`);
    }

    return data.results.map((item): GeocodeResult => {
      const getComponent = (...types: string[]): string | undefined =>
        item.address_components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

      return {
        formattedAddress: item.formatted_address,
        location: {
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
        },
        placeId: item.place_id,
        types: item.types,
        components: {
          city: getComponent('locality', 'administrative_area_level_2'),
          area: getComponent('sublocality', 'administrative_area_level_1'),
          street: getComponent('route'),
          building: getComponent('street_number'),
          country: getComponent('country'),
        },
      };
    });
  }

  /**
   * Calculate route using Google Maps Directions API.
   * @param origin - Starting point
   * @param destination - Ending point
   * @param waypoints - Optional intermediate stops
   * @returns Route result with distance, duration, steps, and polyline
   */
  async getRoute(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<RouteResult> {
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      key: this.apiKey,
    });

    if (waypoints && waypoints.length > 0) {
      const wpStr = waypoints.map((w) => `${w.lat},${w.lng}`).join('|');
      params.set('waypoints', wpStr);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Google Directions failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      status: string;
      routes: Array<{
        legs: Array<{
          distance: { value: number };
          duration: { value: number };
          steps: Array<{
            html_instructions: string;
            distance: { value: number };
            duration: { value: number };
            start_location: { lat: number; lng: number };
            end_location: { lat: number; lng: number };
          }>;
        }>;
        overview_polyline: { points: string };
      }>;
    };

    if (data.status !== 'OK') {
      throw new Error(`Google Directions error: ${data.status}`);
    }

    const route = data.routes[0];
    const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

    const steps: RouteResult['steps'] = [];
    const allWaypoints: LatLng[] = [origin];

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        steps.push({
          instruction: this.stripHtml(step.html_instructions),
          distance: step.distance.value,
          duration: step.duration.value,
          startLocation: { lat: step.start_location.lat, lng: step.start_location.lng },
          endLocation: { lat: step.end_location.lat, lng: step.end_location.lng },
        });
      }
    }

    if (waypoints) {
      allWaypoints.push(...waypoints);
    }
    allWaypoints.push(destination);

    return {
      distance: totalDistance,
      duration: totalDuration,
      polyline: route.overview_polyline.points,
      steps,
      waypoints: allWaypoints,
    };
  }

  /**
   * Calculate distance matrix using Google Maps Distance Matrix API.
   * @param origins - Array of origin coordinates
   * @param destinations - Array of destination coordinates
   * @returns 2D array of distances in meters
   */
  async getDistanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]> {
    const params = new URLSearchParams({
      origins: origins.map((o) => `${o.lat},${o.lng}`).join('|'),
      destinations: destinations.map((d) => `${d.lat},${d.lng}`).join('|'),
      key: this.apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Google Distance Matrix failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      status: string;
      rows: Array<{
        elements: Array<{
          status: string;
          distance?: { value: number };
        }>;
      }>;
    };

    if (data.status !== 'OK') {
      throw new Error(`Google Distance Matrix error: ${data.status}`);
    }

    return data.rows.map((row) =>
      row.elements.map((el) =>
        el.status === 'OK' && el.distance ? el.distance.value : Infinity
      )
    );
  }

  /**
   * Get the Google Maps tile URL template for frontend map rendering.
   * Note: Google Maps typically uses the JS API, but this provides a tile URL fallback.
   * @returns Tile URL template
   */
  getTileUrl(): string {
    return `https://mt1.google.com/vt/x={x}&y={y}&z={z}&key=${this.apiKey}`;
  }

  /**
   * Strip HTML tags from Google's instruction strings.
   * @param html - HTML string to clean
   * @returns Plain text string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

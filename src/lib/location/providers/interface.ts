// GGH — Map Provider Abstract Interface
// All map providers must implement this interface

import type { LatLng, LatLngBounds, GeocodeResult, RouteResult, MapProviderType } from '../types';

/**
 * Abstract MapProvider interface that all map providers must implement.
 * Provides geocoding, routing, distance matrix, and tile URL capabilities.
 */
export interface MapProvider {
  /** Provider name identifier */
  readonly name: MapProviderType;

  /**
   * Forward geocode: convert an address string to geographic coordinates.
   * @param address - The address to geocode
   * @param bounds - Optional bounding box to bias results
   * @returns Array of geocoding results
   */
  geocode(address: string, bounds?: LatLngBounds): Promise<GeocodeResult[]>;

  /**
   * Reverse geocode: convert coordinates to a human-readable address.
   * @param location - The coordinates to reverse geocode
   * @returns Array of geocoding results
   */
  reverseGeocode(location: LatLng): Promise<GeocodeResult[]>;

  /**
   * Calculate a route between origin and destination with optional waypoints.
   * @param origin - Starting point
   * @param destination - Ending point
   * @param waypoints - Optional intermediate stops
   * @returns Route result with distance, duration, steps, and polyline
   */
  getRoute(origin: LatLng, destination: LatLng, waypoints?: LatLng[]): Promise<RouteResult>;

  /**
   * Calculate a distance matrix between multiple origins and destinations.
   * @param origins - Array of origin coordinates
   * @param destinations - Array of destination coordinates
   * @returns 2D array of distances in meters
   */
  getDistanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<number[][]>;

  /**
   * Get the tile URL template for displaying map tiles on the frontend.
   * @returns URL template string with {x}, {y}, {z} placeholders
   */
  getTileUrl(): string;
}

// GGH — Routing Service
// Route calculation, distance, ETA, and multi-stop routing
// Uses the configured map provider

import type { LatLng, RouteResult, Lang } from './types';
import { getMapProvider } from './providers';

/**
 * Calculate a route between two points.
 * @param origin - Starting coordinates
 * @param destination - Ending coordinates
 * @returns Route result with distance, duration, steps, and polyline
 */
export async function getRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  const provider = getMapProvider();
  return provider.getRoute(origin, destination);
}

/**
 * Get the estimated time of arrival (ETA) between two points.
 * @param origin - Starting coordinates
 * @param destination - Ending coordinates
 * @returns ETA in seconds
 */
export async function getETA(
  origin: LatLng,
  destination: LatLng
): Promise<number> {
  const route = await getRoute(origin, destination);
  return route.duration;
}

/**
 * Get the distance between two points via road network.
 * @param origin - Starting coordinates
 * @param destination - Ending coordinates
 * @returns Distance in meters
 */
export async function getDistance(
  origin: LatLng,
  destination: LatLng
): Promise<number> {
  const route = await getRoute(origin, destination);
  return route.distance;
}

/**
 * Calculate a route through multiple stops in order.
 * The route goes: start → waypoint[0] → waypoint[1] → ... → end
 * @param waypoints - Ordered array of coordinates to visit
 * @returns Route result covering all waypoints
 */
export async function getMultiStopRoute(
  waypoints: LatLng[]
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required for a multi-stop route');
  }

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const intermediateWaypoints = waypoints.slice(1, -1);

  const provider = getMapProvider();
  return provider.getRoute(origin, destination, intermediateWaypoints);
}

/**
 * Calculate a distance matrix between multiple origins and destinations.
 * Useful for finding the nearest driver, route optimization, etc.
 * @param origins - Array of origin coordinates
 * @param destinations - Array of destination coordinates
 * @returns 2D array where matrix[i][j] is the distance from origins[i] to destinations[j] in meters
 */
export async function getDistanceMatrix(
  origins: LatLng[],
  destinations: LatLng[]
): Promise<number[][]> {
  const provider = getMapProvider();
  return provider.getDistanceMatrix(origins, destinations);
}

/**
 * Calculate the straight-line (Haversine) distance between two points.
 * This is a geometric calculation, not road distance.
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in meters
 */
export function haversineDistance(from: LatLng, to: LatLng): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format a duration in seconds to a human-readable string.
 * @param seconds - Duration in seconds
 * @param lang - Language preference (en/ar)
 * @returns Formatted duration string (e.g., "25 min", "1 hr 30 min")
 */
export function formatDuration(seconds: number, lang: Lang = 'en'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return lang === 'ar' ? `${minutes} دقيقة` : `${minutes} min`;
  }

  if (minutes === 0) {
    return lang === 'ar' ? `${hours} ساعة` : `${hours} hr`;
  }

  return lang === 'ar' ? `${hours} ساعة ${minutes} دقيقة` : `${hours} hr ${minutes} min`;
}

/**
 * Format a distance in meters to a human-readable string.
 * @param meters - Distance in meters
 * @param lang - Language preference (en/ar)
 * @returns Formatted distance string (e.g., "1.5 km", "500 m")
 */
export function formatDistance(meters: number, lang: Lang = 'en'): string {
  if (meters < 1000) {
    return lang === 'ar' ? `${Math.round(meters)} م` : `${Math.round(meters)} m`;
  }

  const km = meters / 1000;
  return lang === 'ar' ? `${km.toFixed(1)} كم` : `${km.toFixed(1)} km`;
}

// GGH — Geofencing Service
// Geofence creation, point-in-geofence checking, and event detection
// Uses Haversine formula for distance and ray casting for polygon containment

import type { LatLng, Geofence, GeofenceEvent, GpsPosition } from './types';
import { haversineDistance } from './routing';

/**
 * Create a new geofence from partial data, generating the ID.
 * @param data - Geofence data without the id field
 * @returns Complete Geofence object with generated ID
 */
export function createGeofence(data: Omit<Geofence, 'id'>): Geofence {
  return {
    id: `gf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...data,
  };
}

/**
 * Check if a point is inside a circle geofence.
 * Uses the Haversine formula for accurate spherical distance.
 * @param point - The point to check
 * @param center - Center of the circle
 * @param radiusMeters - Radius in meters
 * @returns true if the point is within the circle
 */
export function isPointInCircle(
  point: LatLng,
  center: LatLng,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(point, center);
  return distance <= radiusMeters;
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm.
 * @param point - The point to check
 * @param polygon - Array of vertices forming the polygon
 * @returns true if the point is inside the polygon
 */
export function isPointInPolygon(
  point: LatLng,
  polygon: LatLng[]
): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const { lat, lng } = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point is inside a geofence (circle or polygon).
 * @param point - The point to check
 * @param geofence - The geofence to check against
 * @returns true if the point is within the geofence
 */
export function checkPointInGeofence(
  point: LatLng,
  geofence: Geofence
): boolean {
  if (!geofence.isActive) return false;

  if (geofence.type === 'circle') {
    if (!geofence.center || geofence.radius === undefined) return false;
    return isPointInCircle(point, geofence.center, geofence.radius);
  }

  if (geofence.type === 'polygon') {
    if (!geofence.points || geofence.points.length < 3) return false;
    return isPointInPolygon(point, geofence.points);
  }

  return false;
}

/**
 * Check a point against all active geofences.
 * @param point - The point to check
 * @param geofences - Array of geofences to check against
 * @returns Array of geofences that contain the point
 */
export function checkPointInAllGeofences(
  point: LatLng,
  geofences: Geofence[]
): Geofence[] {
  return geofences.filter((geofence) => checkPointInGeofence(point, geofence));
}

/**
 * Detect geofence enter/exit events by comparing previous and current positions.
 * Uses the previous position to determine if the entity crossed a geofence boundary.
 * @param previousPosition - Previous GPS position (null if first report)
 * @param currentPosition - Current GPS position
 * @param geofences - Array of geofences to check against
 * @returns Array of geofence events (enter/exit)
 */
export function detectGeofenceEvents(
  previousPosition: GpsPosition | null,
  currentPosition: GpsPosition,
  geofences: Geofence[]
): GeofenceEvent[] {
  const events: GeofenceEvent[] = [];

  const currentInGeofences = new Set(
    checkPointInAllGeofences(currentPosition.location, geofences).map((g) => g.id)
  );

  if (previousPosition) {
    const previousInGeofences = new Set(
      checkPointInAllGeofences(previousPosition.location, geofences).map((g) => g.id)
    );

    // Detect exits: was in geofence before, not in it now
    for (const geofenceId of previousInGeofences) {
      if (!currentInGeofences.has(geofenceId)) {
        events.push({
          geofenceId,
          entityId: currentPosition.entityId,
          entityType: currentPosition.entityType === 'driver' ? 'driver' : 'order',
          event: 'exit',
          location: currentPosition.location,
          timestamp: currentPosition.timestamp,
        });
      }
    }

    // Detect entries: wasn't in geofence before, is in it now
    for (const geofenceId of currentInGeofences) {
      if (!previousInGeofences.has(geofenceId)) {
        events.push({
          geofenceId,
          entityId: currentPosition.entityId,
          entityType: currentPosition.entityType === 'driver' ? 'driver' : 'order',
          event: 'enter',
          location: currentPosition.location,
          timestamp: currentPosition.timestamp,
        });
      }
    }
  } else {
    // No previous position — report all current geofences as entries
    for (const geofenceId of currentInGeofences) {
      events.push({
        geofenceId,
        entityId: currentPosition.entityId,
        entityType: currentPosition.entityType === 'driver' ? 'driver' : 'order',
        event: 'enter',
        location: currentPosition.location,
        timestamp: currentPosition.timestamp,
      });
    }
  }

  return events;
}

/**
 * Convert a Prisma Geofence record to a Geofence domain object.
 * Parses the JSON points field for polygon geofences.
 * @param record - Prisma Geofence record
 * @returns Geofence domain object
 */
export function prismaToGeofence(record: {
  id: string;
  nameEn: string;
  nameAr: string;
  type: string;
  centerLat: number | null;
  centerLng: number | null;
  radius: number | null;
  points: string;
  metadata: string;
  isActive: boolean;
}): Geofence {
  let parsedPoints: LatLng[] | undefined;
  let parsedMetadata: Record<string, string> | undefined;

  try {
    if (record.points && record.type === 'polygon') {
      parsedPoints = JSON.parse(record.points) as LatLng[];
    }
  } catch {
    parsedPoints = undefined;
  }

  try {
    if (record.metadata) {
      parsedMetadata = JSON.parse(record.metadata) as Record<string, string>;
    }
  } catch {
    parsedMetadata = undefined;
  }

  return {
    id: record.id,
    nameEn: record.nameEn,
    nameAr: record.nameAr,
    type: record.type as 'circle' | 'polygon',
    center:
      record.centerLat !== null && record.centerLng !== null
        ? { lat: record.centerLat, lng: record.centerLng }
        : undefined,
    radius: record.radius ?? undefined,
    points: parsedPoints,
    metadata: parsedMetadata,
    isActive: record.isActive,
  };
}

/**
 * Convert a Geofence domain object to Prisma-compatible data.
 * Serializes the points field to JSON for polygon geofences.
 * @param geofence - Geofence domain object (without id)
 * @returns Prisma-compatible data object
 */
export function geofenceToPrisma(geofence: Omit<Geofence, 'id'>): {
  nameEn: string;
  nameAr: string;
  type: string;
  centerLat: number | null;
  centerLng: number | null;
  radius: number | null;
  points: string;
  metadata: string;
  isActive: boolean;
} {
  return {
    nameEn: geofence.nameEn,
    nameAr: geofence.nameAr,
    type: geofence.type,
    centerLat: geofence.center?.lat ?? null,
    centerLng: geofence.center?.lng ?? null,
    radius: geofence.radius ?? null,
    points: geofence.points ? JSON.stringify(geofence.points) : '[]',
    metadata: geofence.metadata ? JSON.stringify(geofence.metadata) : '{}',
    isActive: geofence.isActive,
  };
}

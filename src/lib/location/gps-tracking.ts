// GGH — GPS Tracking Service
// Real-time GPS position tracking, position history, nearby driver search, and ETA
// Uses Prisma for persistence and in-memory cache for latest positions

import type { LatLng, GpsPosition } from './types';
import { getETA as calculateETA } from './routing';
import { haversineDistance } from './routing';
import { db } from '@/lib/db';

/** In-memory cache for latest GPS positions (keyed by entityId) */
const latestPositions = new Map<string, GpsPosition>();

/** Maximum position history to keep in memory per entity */
const MAX_HISTORY_PER_ENTITY = 100;

/** Position history buffer per entity */
const positionHistory = new Map<string, GpsPosition[]>();

/**
 * Update or store a GPS position report.
 * Persists to database and updates in-memory cache.
 * @param position - The GPS position to store
 */
export async function updatePosition(position: GpsPosition): Promise<void> {
  // Update in-memory cache
  latestPositions.set(position.entityId, position);

  // Update in-memory history buffer
  const history = positionHistory.get(position.entityId) ?? [];
  history.push(position);
  if (history.length > MAX_HISTORY_PER_ENTITY) {
    history.shift();
  }
  positionHistory.set(position.entityId, history);

  // Persist to database
  await db.gpsPositionLog.create({
    data: {
      entityId: position.entityId,
      entityType: position.entityType,
      latitude: position.location.lat,
      longitude: position.location.lng,
      heading: position.heading,
      speed: position.speed,
      accuracy: position.accuracy,
      batteryLevel: position.batteryLevel ?? null,
      timestamp: new Date(position.timestamp),
    },
  });
}

/**
 * Get the latest GPS position for an entity.
 * Checks in-memory cache first, falls back to database.
 * @param entityId - The entity ID (driver or vehicle ID)
 * @returns Latest GPS position, or null if not found
 */
export async function getPosition(entityId: string): Promise<GpsPosition | null> {
  // Check in-memory cache first
  const cached = latestPositions.get(entityId);
  if (cached) return cached;

  // Fall back to database
  const latest = await db.gpsPositionLog.findFirst({
    where: { entityId },
    orderBy: { timestamp: 'desc' },
  });

  if (!latest) return null;

  const position: GpsPosition = {
    entityId: latest.entityId,
    entityType: latest.entityType as 'driver' | 'vehicle',
    location: { lat: latest.latitude, lng: latest.longitude },
    heading: latest.heading,
    speed: latest.speed,
    accuracy: latest.accuracy,
    batteryLevel: latest.batteryLevel ?? undefined,
    timestamp: latest.timestamp.toISOString(),
  };

  // Update cache
  latestPositions.set(entityId, position);
  return position;
}

/**
 * Get position history for an entity within a time range.
 * @param entityId - The entity ID
 * @param from - Start of time range
 * @param to - End of time range
 * @returns Array of GPS positions ordered by timestamp ascending
 */
export async function getPositionHistory(
  entityId: string,
  from: Date,
  to: Date
): Promise<GpsPosition[]> {
  const logs = await db.gpsPositionLog.findMany({
    where: {
      entityId,
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  return logs.map((log): GpsPosition => ({
    entityId: log.entityId,
    entityType: log.entityType as 'driver' | 'vehicle',
    location: { lat: log.latitude, lng: log.longitude },
    heading: log.heading,
    speed: log.speed,
    accuracy: log.accuracy,
    batteryLevel: log.batteryLevel ?? undefined,
    timestamp: log.timestamp.toISOString(),
  }));
}

/**
 * Find available drivers near a given location within a radius.
 * Uses in-memory positions for speed, with Haversine distance filtering.
 * @param location - The center point to search around
 * @param radiusMeters - Search radius in meters
 * @returns Array of GPS positions of nearby drivers, sorted by distance
 */
export async function getNearbyDrivers(
  location: LatLng,
  radiusMeters: number
): Promise<Array<GpsPosition & { distanceFromTarget: number }>> {
  // Get all available drivers from database
  const availableDrivers = await db.driver.findMany({
    where: { isAvailable: true, isActive: true },
    select: { id: true },
  });

  const driverIds = new Set(availableDrivers.map((d) => d.id));
  const results: Array<GpsPosition & { distanceFromTarget: number }> = [];

  // Check in-memory cache for all drivers
  for (const [entityId, position] of latestPositions.entries()) {
    if (position.entityType !== 'driver') continue;
    if (!driverIds.has(entityId)) continue;

    const distance = haversineDistance(location, position.location);
    if (distance <= radiusMeters) {
      results.push({ ...position, distanceFromTarget: Math.round(distance) });
    }
  }

  // If we have fewer results than available drivers, check DB for missing ones
  if (results.length < driverIds.size) {
    const foundIds = new Set(results.map((r) => r.entityId));
    const missingIds = availableDrivers.filter((d) => !foundIds.has(d.id));

    for (const driver of missingIds) {
      const latest = await db.gpsPositionLog.findFirst({
        where: { entityId: driver.id, entityType: 'driver' },
        orderBy: { timestamp: 'desc' },
      });

      if (latest) {
        const position: GpsPosition = {
          entityId: latest.entityId,
          entityType: 'driver',
          location: { lat: latest.latitude, lng: latest.longitude },
          heading: latest.heading,
          speed: latest.speed,
          accuracy: latest.accuracy,
          batteryLevel: latest.batteryLevel ?? undefined,
          timestamp: latest.timestamp.toISOString(),
        };

        const distance = haversineDistance(location, position.location);
        if (distance <= radiusMeters) {
          results.push({ ...position, distanceFromTarget: Math.round(distance) });
          latestPositions.set(driver.id, position);
        }
      }
    }
  }

  // Sort by distance
  results.sort((a, b) => a.distanceFromTarget - b.distanceFromTarget);
  return results;
}

/**
 * Calculate real-time ETA for a driver to reach a destination.
 * Uses the driver's current position and the routing service.
 * @param driverId - The driver's entity ID
 * @param destination - The destination coordinates
 * @returns ETA in seconds, or null if driver position is unavailable
 */
export async function calculateDriverETA(
  driverId: string,
  destination: LatLng
): Promise<number | null> {
  const position = await getPosition(driverId);
  if (!position) return null;

  try {
    return await calculateETA(position.location, destination);
  } catch {
    // If routing fails, use straight-line estimate (very rough)
    const distance = haversineDistance(position.location, destination);
    const avgSpeedKmh = 30; // Assume 30 km/h average in Cairo
    return (distance / 1000 / avgSpeedKmh) * 3600;
  }
}

/**
 * Get all currently tracked positions (for admin/monitoring).
 * @returns Map of entityId to latest GPS position
 */
export function getAllCurrentPositions(): Map<string, GpsPosition> {
  return new Map(latestPositions);
}

/**
 * Clear the in-memory position cache (for testing).
 */
export function clearPositionCache(): void {
  latestPositions.clear();
  positionHistory.clear();
}

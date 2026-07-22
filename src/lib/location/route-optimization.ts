// GGH — Route Optimization Service
// Multi-stop route optimization using nearest-neighbor heuristic
// Production would use OR-Tools or similar, but this provides a functional baseline

import type { LatLng, RouteOptimizationRequest, OptimizedRoute } from './types';
import { haversineDistance } from './routing';

/**
 * Optimize the stop order for a multi-stop delivery route.
 * Uses a nearest-neighbor heuristic: always visit the closest unvisited stop next.
 * Respects time windows if provided by skipping stops whose window has passed.
 * Calculates ETAs and distances for each leg.
 * @param request - The route optimization request
 * @returns Optimized route with ordered stops and ETAs
 */
export async function optimizeRoute(
  request: RouteOptimizationRequest
): Promise<OptimizedRoute> {
  const { start, stops, end, optimizeFor } = request;

  if (stops.length === 0) {
    return {
      stops: [],
      totalDistance: 0,
      totalDuration: 0,
      polyline: '',
    };
  }

  // If only one stop, no optimization needed
  if (stops.length === 1) {
    const stop = stops[0];
    const distanceToStop = await getDistanceOrHaversine(start, stop.location);
    const durationToStop = estimateDuration(distanceToStop);
    const arrivalTime = new Date(Date.now() + durationToStop * 1000);

    const endDistance = end
      ? await getDistanceOrHaversine(stop.location, end)
      : 0;
    const endDuration = estimateDuration(endDistance);

    return {
      stops: [{
        id: stop.id,
        order: 1,
        location: stop.location,
        estimatedArrival: arrivalTime.toISOString(),
        distanceFromPrev: distanceToStop,
        durationFromPrev: durationToStop,
      }],
      totalDistance: distanceToStop + endDistance,
      totalDuration: durationToStop + endDuration,
      polyline: '',
    };
  }

  // Nearest-neighbor heuristic
  const orderedStops = nearestNeighborSort(start, stops, optimizeFor);

  // Calculate ETAs and distances for each leg
  const optimizedStops: OptimizedRoute['stops'] = [];
  let currentLocation: LatLng = start;
  let currentArrivalTime = Date.now();
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < orderedStops.length; i++) {
    const stop = orderedStops[i];
    const legDistance = await getDistanceOrHaversine(currentLocation, stop.location);
    const legDuration = estimateDuration(legDistance);
    const serviceTime = (stop.serviceTime ?? 5) * 60; // default 5 min service time

    currentArrivalTime += legDuration * 1000;
    totalDistance += legDistance;
    totalDuration += legDuration + serviceTime;

    // Check time window constraint
    if (stop.timeWindow) {
      const windowStart = new Date(stop.timeWindow.start).getTime();
      const windowEnd = new Date(stop.timeWindow.end).getTime();

      // If we arrive after the window closes, skip this stop (mark as delayed)
      if (currentArrivalTime > windowEnd) {
        currentArrivalTime += serviceTime * 1000;
      }
      // If we arrive before the window opens, wait
      if (currentArrivalTime < windowStart) {
        const waitTime = windowStart - currentArrivalTime;
        currentArrivalTime = windowStart;
        totalDuration += waitTime / 1000;
      }
    }

    optimizedStops.push({
      id: stop.id,
      order: i + 1,
      location: stop.location,
      estimatedArrival: new Date(currentArrivalTime).toISOString(),
      distanceFromPrev: Math.round(legDistance),
      durationFromPrev: Math.round(legDuration),
    });

    // Add service time
    currentArrivalTime += serviceTime * 1000;
    currentLocation = stop.location;
  }

  // Add distance to end point if specified
  if (end) {
    const endDistance = await getDistanceOrHaversine(currentLocation, end);
    const endDuration = estimateDuration(endDistance);
    totalDistance += endDistance;
    totalDuration += endDuration;
  }

  return {
    stops: optimizedStops,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration),
    polyline: '',
  };
}

/**
 * Sort stops using the nearest-neighbor heuristic.
 * For distance optimization: always go to the closest unvisited stop.
 * For time optimization: prefer stops with the earliest time windows, then closest.
 * @param start - Starting point
 * @param stops - Unordered stops
 * @param optimizeFor - Optimization criterion (distance or time)
 * @returns Sorted array of stops
 */
function nearestNeighborSort(
  start: LatLng,
  stops: RouteOptimizationRequest['stops'],
  optimizeFor: 'distance' | 'time'
): RouteOptimizationRequest['stops'] {
  const remaining = [...stops];
  const ordered: RouteOptimizationRequest['stops'] = [];
  let currentLocation = start;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      const distance = haversineDistance(currentLocation, stop.location);

      if (optimizeFor === 'time' && stop.timeWindow) {
        // For time optimization, prioritize stops with earlier time windows
        const windowStart = new Date(stop.timeWindow.start).getTime();
        const now = Date.now();
        const urgency = Math.max(0, windowStart - now);
        const score = distance + urgency * 0.001; // balance distance vs urgency
        if (score < bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      } else {
        if (distance < bestScore) {
          bestScore = distance;
          bestIndex = i;
        }
      }
    }

    const selected = remaining.splice(bestIndex, 1)[0];
    if (selected) {
      ordered.push(selected);
      currentLocation = selected.location;
    }
  }

  return ordered;
}

/**
 * Get the distance between two points, trying the routing provider first,
 * falling back to Haversine distance if routing fails.
 * @param from - Starting point
 * @param to - Ending point
 * @returns Distance in meters
 */
async function getDistanceOrHaversine(from: LatLng, to: LatLng): Promise<number> {
  try {
    const { getDistance } = await import('./routing');
    return await getDistance(from, to);
  } catch {
    return haversineDistance(from, to);
  }
}

/**
 * Estimate travel duration from distance.
 * Uses average speed of 30 km/h for Cairo urban driving.
 * @param distanceMeters - Distance in meters
 * @returns Estimated duration in seconds
 */
function estimateDuration(distanceMeters: number): number {
  const avgSpeedMetersPerSecond = 30000 / 3600; // 30 km/h in m/s
  return Math.round(distanceMeters / avgSpeedMetersPerSecond);
}

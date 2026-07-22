// GGH — Location Intelligence Module
// Barrel export for all location services

// Configuration
export { getMapConfig, getMapConfigCached, isProviderConfigured } from './config';
export type { MapConfig, MapProviderType } from './config';

// Types
export type {
  LatLng,
  RouteStep,
  RouteResult,
  GeocodeResult,
  Geofence,
  GeofenceEvent,
  GpsPosition,
  RouteOptimizationRequest,
  OptimizedRoute,
  LatLngBounds,
  Lang,
} from './types';

// Providers
export { getMapProvider, resetMapProvider } from './providers';
export type { MapProvider } from './providers/interface';

// Geocoding
export { geocodeAddress, reverseGeocode, geocodeArea, clearGeocodeCache } from './geocoding';

// Routing
export {
  getRoute,
  getETA,
  getDistance,
  getMultiStopRoute,
  getDistanceMatrix,
  haversineDistance,
  formatDuration,
  formatDistance,
} from './routing';

// Geofencing
export {
  createGeofence,
  checkPointInGeofence,
  checkPointInAllGeofences,
  detectGeofenceEvents,
  isPointInCircle,
  isPointInPolygon,
  prismaToGeofence,
  geofenceToPrisma,
} from './geofencing';

// GPS Tracking
export {
  updatePosition,
  getPosition,
  getPositionHistory,
  getNearbyDrivers,
  calculateDriverETA,
  getAllCurrentPositions,
  clearPositionCache,
} from './gps-tracking';

// Route Optimization
export { optimizeRoute } from './route-optimization';

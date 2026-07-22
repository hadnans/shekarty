// GGH — Location Intelligence Module Types
// All types for Location, Route, Geofence, GPS tracking, and Route Optimization

/** Latitude/Longitude coordinate pair */
export interface LatLng {
  lat: number;
  lng: number;
}

/** A single step/instruction within a route */
export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation: LatLng;
  endLocation: LatLng;
}

/** Complete route result between two or more points */
export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  polyline: string; // encoded polyline or GeoJSON
  steps: RouteStep[];
  waypoints: LatLng[];
}

/** Geocoding result for an address or place */
export interface GeocodeResult {
  formattedAddress: string;
  addressAr?: string;
  location: LatLng;
  placeId: string;
  types: string[];
  components?: {
    city?: string;
    area?: string;
    street?: string;
    building?: string;
    country?: string;
  };
}

/** Geofence definition (circle or polygon) */
export interface Geofence {
  id: string;
  nameEn: string;
  nameAr: string;
  type: 'circle' | 'polygon';
  center?: LatLng; // for circle type
  radius?: number; // meters, for circle type
  points?: LatLng[]; // for polygon type
  metadata?: Record<string, string>;
  isActive: boolean;
}

/** Geofence event (enter/exit) */
export interface GeofenceEvent {
  geofenceId: string;
  entityId: string;
  entityType: 'driver' | 'order';
  event: 'enter' | 'exit';
  location: LatLng;
  timestamp: string;
}

/** GPS position report from a driver or vehicle */
export interface GpsPosition {
  entityId: string;
  entityType: 'driver' | 'vehicle';
  location: LatLng;
  heading: number; // degrees 0-360
  speed: number; // km/h
  accuracy: number; // meters
  batteryLevel?: number; // percent
  timestamp: string;
}

/** Request body for route optimization */
export interface RouteOptimizationRequest {
  start: LatLng;
  stops: Array<{
    id: string;
    location: LatLng;
    type: 'delivery' | 'pickup';
    timeWindow?: { start: string; end: string };
    serviceTime?: number; // minutes
  }>;
  end?: LatLng;
  optimizeFor: 'distance' | 'time';
}

/** Optimized route result with stop order and ETAs */
export interface OptimizedRoute {
  stops: Array<{
    id: string;
    order: number;
    location: LatLng;
    estimatedArrival: string;
    distanceFromPrev: number; // meters
    durationFromPrev: number; // seconds
  }>;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  polyline: string;
}

/** Supported map provider types */
export type MapProviderType = 'google' | 'mapbox' | 'osm' | 'here';

/** Bounding box for geocoding bias */
export interface LatLngBounds {
  sw: LatLng;
  ne: LatLng;
}

/** Language identifier for bilingual support */
export type Lang = 'en' | 'ar';

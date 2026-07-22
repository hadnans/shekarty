// GGH — Map Provider Factory
// Reads MAP_PROVIDER env and returns the appropriate provider instance
// Defaults to OSM (free, no API key needed)

import type { MapProvider } from './interface';
import { OsmProvider } from './osm';
import { GoogleMapsProvider } from './google';
import { MapboxProvider } from './mapbox';
import { HereMapsProvider } from './here';
import type { MapProviderType } from '../types';

/** Cached provider instance (singleton per process) */
let cachedProvider: MapProvider | null = null;

/**
 * Get the configured map provider instance.
 * Reads MAP_PROVIDER env variable (google | mapbox | osm | here).
 * Defaults to OSM if not set or if the configured provider lacks its API key.
 * Provider instance is cached after first creation.
 * @returns MapProvider instance
 */
export function getMapProvider(): MapProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = (process.env.MAP_PROVIDER as MapProviderType) || 'osm';
  cachedProvider = createProvider(provider);
  return cachedProvider;
}

/**
 * Create a new map provider instance based on the provider type.
 * Falls back to OSM if the requested provider is not properly configured.
 * @param provider - The map provider type to create
 * @returns MapProvider instance
 */
function createProvider(provider: MapProviderType): MapProvider {
  switch (provider) {
    case 'google':
      try {
        return new GoogleMapsProvider();
      } catch {
        console.warn('[GGH Location] Google Maps provider not configured, falling back to OSM');
        return new OsmProvider();
      }
    case 'mapbox':
      try {
        return new MapboxProvider();
      } catch {
        console.warn('[GGH Location] Mapbox provider not configured, falling back to OSM');
        return new OsmProvider();
      }
    case 'here':
      try {
        return new HereMapsProvider();
      } catch {
        console.warn('[GGH Location] HERE Maps provider not configured, falling back to OSM');
        return new OsmProvider();
      }
    case 'osm':
    default:
      return new OsmProvider();
  }
}

/**
 * Reset the cached provider. Useful for testing or when changing env vars.
 */
export function resetMapProvider(): void {
  cachedProvider = null;
}

/** Re-export provider classes for direct instantiation if needed */
export { OsmProvider, GoogleMapsProvider, MapboxProvider, HereMapsProvider };

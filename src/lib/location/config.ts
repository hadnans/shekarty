// GGH — Location Intelligence Module Configuration
// Reads MAP_PROVIDER env and provider-specific API keys
// Validates with Zod, defaults to OSM (free, no key needed)

import { z } from 'zod';

/** Supported map provider types */
export type MapProviderType = 'google' | 'mapbox' | 'osm' | 'here';

/** Zod schema for map provider configuration */
const mapConfigSchema = z.object({
  provider: z.enum(['google', 'mapbox', 'osm', 'here']).default('osm'),
  googleMapsApiKey: z.string().optional(),
  mapboxApiKey: z.string().optional(),
  hereMapsApiKey: z.string().optional(),
});

/** Validated map configuration type */
export type MapConfig = z.infer<typeof mapConfigSchema>;

/**
 * Parse and validate map configuration from environment variables.
 * Defaults to OSM provider when MAP_PROVIDER is not set.
 * @returns Validated MapConfig object
 */
export function getMapConfig(): MapConfig {
  return mapConfigSchema.parse({
    provider: (process.env.MAP_PROVIDER as MapProviderType) || 'osm',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    mapboxApiKey: process.env.MAPBOX_API_KEY,
    hereMapsApiKey: process.env.HERE_MAPS_API_KEY,
  });
}

/**
 * Check if a provider is properly configured with its required API key.
 * OSM always works (no key needed).
 * @param provider - The map provider type to check
 * @returns true if the provider has the required configuration
 */
export function isProviderConfigured(provider: MapProviderType): boolean {
  const config = getMapConfig();
  switch (provider) {
    case 'osm':
      return true; // OSM is always available (free, no key)
    case 'google':
      return typeof config.googleMapsApiKey === 'string' && config.googleMapsApiKey.length > 0;
    case 'mapbox':
      return typeof config.mapboxApiKey === 'string' && config.mapboxApiKey.length > 0;
    case 'here':
      return typeof config.hereMapsApiKey === 'string' && config.hereMapsApiKey.length > 0;
    default:
      return false;
  }
}

/** Cached map config (singleton per process) */
let cachedConfig: MapConfig | null = null;

/**
 * Get the map configuration, cached after first call.
 * @returns Cached MapConfig object
 */
export function getMapConfigCached(): MapConfig {
  if (!cachedConfig) {
    cachedConfig = getMapConfig();
  }
  return cachedConfig;
}

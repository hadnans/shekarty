// GGH — Geocoding Service
// Forward/reverse geocoding using the configured map provider
// Includes in-memory LRU cache with 1-hour TTL

import type { LatLng, GeocodeResult, Lang } from './types';
import { getMapProvider } from './providers';

// ============================================
// LRU CACHE — In-memory, 100 entries, 1hr TTL
// ============================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Simple LRU cache with TTL support */
class LruCache<T> {
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly map: Map<string, CacheEntry<T>>;

  constructor(maxSize: number = 100, ttlMs: number = 3600000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  /** Get a cached value by key. Returns undefined if not found or expired. */
  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /** Set a cached value with TTL. Evicts oldest entry if at capacity. */
  set(key: string, value: T): void {
    // Remove existing entry if present
    this.map.delete(key);
    // Evict oldest entry if at capacity
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /** Clear all cached entries */
  clear(): void {
    this.map.clear();
  }

  /** Get current cache size */
  get size(): number {
    return this.map.size;
  }
}

// Geocode cache instances
const forwardCache = new LruCache<GeocodeResult[]>(100, 3600000);
const reverseCache = new LruCache<GeocodeResult[]>(100, 3600000);

/**
 * Forward geocode an address string to geographic coordinates.
 * Results are cached in memory for 1 hour.
 * @param address - The address string to geocode
 * @param lang - Language preference for results (en/ar)
 * @returns Array of geocoding results
 */
export async function geocodeAddress(
  address: string,
  lang?: Lang
): Promise<GeocodeResult[]> {
  const cacheKey = `fwd:${lang ?? 'en'}:${address}`;
  const cached = forwardCache.get(cacheKey);
  if (cached) return cached;

  const provider = getMapProvider();
  const results = await provider.geocode(address);

  forwardCache.set(cacheKey, results);
  return results;
}

/**
 * Reverse geocode coordinates to a human-readable address.
 * Results are cached in memory for 1 hour.
 * @param location - The coordinates to reverse geocode
 * @param lang - Language preference for results (en/ar)
 * @returns Array of geocoding results
 */
export async function reverseGeocode(
  location: LatLng,
  lang?: Lang
): Promise<GeocodeResult[]> {
  const cacheKey = `rev:${lang ?? 'en'}:${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
  const cached = reverseCache.get(cacheKey);
  if (cached) return cached;

  const provider = getMapProvider();
  const results = await provider.reverseGeocode(location);

  reverseCache.set(cacheKey, results);
  return results;
}

/**
 * Geocode an area within a city (useful for delivery zone mapping).
 * Combines area and city into a focused geocoding query.
 * @param area - The area/district name (e.g., "Nasr City", "Maadi")
 * @param city - The city name (default: "Cairo")
 * @param lang - Language preference for results
 * @returns Array of geocoding results focused on the area
 */
export async function geocodeArea(
  area: string,
  city?: string,
  lang?: Lang
): Promise<GeocodeResult[]> {
  const cityName = city ?? 'Cairo';
  const query = `${area}, ${cityName}, Egypt`;
  return geocodeAddress(query, lang);
}

/**
 * Clear all geocoding caches.
 * Useful for testing or when provider configuration changes.
 */
export function clearGeocodeCache(): void {
  forwardCache.clear();
  reverseCache.clear();
}

// GGH — Memory Cache Layer
// TTL-based in-memory cache with LRU eviction and getOrSet pattern

import { createLogger } from './logger';

const logger = createLogger('cache');

interface CacheOptions {
  /** Time to live in milliseconds */
  ttl: number;
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private store: Map<string, CacheEntry<unknown>>;
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions) {
    this.defaultTtl = options.ttl;
    this.maxSize = options.maxSize ?? 1000;
    this.store = new Map();
  }

  /**
   * Get a cached value by key.
   * Returns null if the key doesn't exist or has expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a cached value with an optional TTL override.
   * Evicts the oldest entry if the cache is at max capacity.
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict if at capacity and key doesn't already exist
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      // Delete the first (oldest) entry
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTtl),
    });
  }

  /** Delete a cached entry by key */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Delete all entries matching a prefix */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** Clear all cached entries */
  clear(): void {
    this.store.clear();
  }

  /** Check if a key exists and is not expired */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get-or-set pattern: return cached value if it exists,
   * otherwise call the factory function, cache the result, and return it.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    logger.debug('Cache miss', { key });
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /** Get the current number of entries (including potentially expired ones) */
  get size(): number {
    return this.store.size;
  }
}

// ============================================
// PRE-CONFIGURED CACHES
// ============================================

/** Product data cache — 5 minute TTL */
export const productCache = new MemoryCache({ ttl: 5 * 60 * 1000 });

/** Category data cache — 10 minute TTL */
export const categoryCache = new MemoryCache({ ttl: 10 * 60 * 1000 });

/** Geocode result cache — 1 hour TTL */
export const geocodeCache = new MemoryCache({ ttl: 60 * 60 * 1000 });

/** Stock level cache — 30 second TTL */
export const stockCache = new MemoryCache({ ttl: 30 * 1000 });

// ============================================
// CACHE KEY HELPERS
// ============================================

/**
 * Build a colon-separated cache key from parts.
 * Example: cacheKey('products', 'list', 'cat-123', 'page-1') → 'products:list:cat-123:page-1'
 */
export function cacheKey(...parts: string[]): string {
  return parts.join(':');
}

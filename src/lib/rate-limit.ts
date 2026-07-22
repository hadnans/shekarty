// GGH — Rate Limiting
// In-memory sliding window rate limiter with pre-configured limiters

import { NextResponse } from 'next/server';
import { RateLimitError } from './errors';
import { createLogger } from './logger';

const logger = createLogger('rate-limit');

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxRequests: number;
  /** Custom key generator (default: IP from x-forwarded-for or x-real-ip) */
  keyGenerator?: (request: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly keyGenerator: (request: Request) => string;
  private cleanupTimer: ReturnType<typeof setInterval> | null;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.keyGenerator = options.keyGenerator ?? this.defaultKeyGenerator;
    this.store = new Map();
    this.cleanupTimer = null;

    // Periodic cleanup of expired entries (every 5 minutes)
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      // Allow the process to exit if this is the only timer
      if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        this.cleanupTimer.unref();
      }
    }
  }

  private defaultKeyGenerator(request: Request): string {
    // Try common headers for client IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }
    return 'unknown';
  }

  /**
   * Check if a request is allowed under the rate limit.
   * @returns Object with allowed flag, remaining requests, and reset time
   */
  check(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.keyGenerator(request);
    const now = Date.now();

    const entry = this.store.get(key);

    // No entry or expired window → start fresh
    if (!entry || now >= entry.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    // Within the window → increment count
    entry.count += 1;

    if (entry.count > this.maxRequests) {
      logger.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        max: this.maxRequests,
        windowMs: this.windowMs,
      });
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Middleware helper for API routes.
   * Returns null if the request is allowed, or a NextResponse with 429 if blocked.
   */
  middleware(): (request: Request) => NextResponse | null {
    return (request: Request) => {
      const result = this.check(request);

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please try again later.',
            code: 'RATE_LIMITED',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(this.maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            },
          }
        );
        return response;
      }

      return null;
    };
  }

  /**
   * Check rate limit and throw RateLimitError if exceeded.
   * Use this in API route handlers for a throw-based flow.
   */
  checkOrThrow(request: Request): void {
    const result = this.check(request);
    if (!result.allowed) {
      throw new RateLimitError(
        'Too many requests. Please try again later.',
        'RATE_LIMITED'
      );
    }
  }

  /** Remove expired entries from the store */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /** Clear all entries */
  reset(): void {
    this.store.clear();
  }
}

// ============================================
// PRE-CONFIGURED LIMITERS
// ============================================

/** Auth endpoints: 10 requests per 15 minutes */
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

/** General API: 60 requests per minute */
export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
});

/** Search: 30 requests per minute */
export const searchLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

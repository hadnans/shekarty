// GGH — Environment Variable Validation
// Validates required environment variables at import time using Zod

import { z } from 'zod';

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // ERPNext (optional — integration is disabled if not provided)
  ERP_NEXT_URL: z.string().url().optional(),
  ERP_NEXT_API_KEY: z.string().optional(),
  ERP_NEXT_API_SECRET: z.string().optional(),

  // Map provider configuration
  MAP_PROVIDER: z.enum(['google', 'mapbox', 'osm', 'here']).default('osm'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  MAPBOX_API_KEY: z.string().optional(),
  HERE_MAPS_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at import time.
 * Throws if required variables are missing or invalid.
 */
function validateEnv(): Env {
  // Provide defaults for optional/missing values so validation doesn't fail
  const raw = {
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    ERP_NEXT_URL: process.env.ERP_NEXT_URL || undefined,
    ERP_NEXT_API_KEY: process.env.ERP_NEXT_API_KEY || undefined,
    ERP_NEXT_API_SECRET: process.env.ERP_NEXT_API_SECRET || undefined,
    MAP_PROVIDER: process.env.MAP_PROVIDER ?? 'osm',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || undefined,
    MAPBOX_API_KEY: process.env.MAPBOX_API_KEY || undefined,
    HERE_MAPS_API_KEY: process.env.HERE_MAPS_API_KEY || undefined,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error('[ENV] Invalid environment variables:');
    for (const [field, messages] of Object.entries(errors)) {
      console.error(`  ${field}: ${messages?.join(', ')}`);
    }
    // In development, warn but don't crash; in production, throw
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
    }
    console.warn('[ENV] Using defaults for missing values in development mode');
    return envSchema.parse({
      ...raw,
      DATABASE_URL: raw.DATABASE_URL || 'file:./db/custom.db',
    });
  }

  return result.data;
}

export const env = validateEnv();

// GGH Admin — Analytics: Product Performance
// GET: Top sellers, low stock, product metrics

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { getProductAnalytics } from '@/lib/analytics/service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-analytics-products');

const productAnalyticsSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
  categoryId: z.string().optional(),
  sortBy: z.enum(['totalSold', 'revenue']).default('totalSold'),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = productAnalyticsSchema.parse(queryParams);

  const result = await getProductAnalytics(validated);

  logger.info('Admin product analytics', { adminId: admin.id, limit: validated.limit });

  return successResponse(result);
});

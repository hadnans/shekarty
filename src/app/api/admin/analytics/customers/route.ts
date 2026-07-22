// GGH Admin — Analytics: Customer Growth & Tier Distribution
// GET: Customer analytics (growth, tier distribution, repeat rate, avg order value)

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { ANALYTICS_PERIODS } from '@/lib/analytics/config';
import { getCustomerAnalytics } from '@/lib/analytics/service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-analytics-customers');

const customerAnalyticsSchema = z.object({
  period: z.enum([...ANALYTICS_PERIODS] as [string, ...string[]]).default('month'),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = customerAnalyticsSchema.parse(queryParams);

  const result = await getCustomerAnalytics({ period: validated.period });

  logger.info('Admin customer analytics', { adminId: admin.id, period: validated.period });

  return successResponse(result);
});

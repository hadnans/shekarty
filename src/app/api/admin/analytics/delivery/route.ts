// GGH Admin — Analytics: Delivery Performance
// GET: Delivery SLA, avg time, failures, status breakdown

import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { getDeliveryAnalytics } from '@/lib/analytics/service';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-analytics-delivery');

const deliveryAnalyticsSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = deliveryAnalyticsSchema.parse(queryParams);

  const result = await getDeliveryAnalytics({
    dateFrom: validated.dateFrom,
    dateTo: validated.dateTo,
  });

  logger.info('Admin delivery analytics', { adminId: admin.id });

  return successResponse(result);
});

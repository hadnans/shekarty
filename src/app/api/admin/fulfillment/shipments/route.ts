// GGH Admin Fulfillment — Shipments: GET shipment list
// Uses apiHandler, requireAdminAuthOrThrow

import { NextRequest } from 'next/server';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { paginatedResponse } from '@/lib/ggh/auth';
import { getShipmentList } from '@/lib/fulfillment/shipment';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-fulfillment-shipments');

// ============================================
// VALIDATION
// ============================================

const shipmentListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  providerId: z.string().optional(),
});

// ============================================
// GET — Shipment list with filters
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const parsed = shipmentListSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const { page, limit, status, providerId } = parsed.data;

  const result = await getShipmentList({
    status: status as 'created' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned' | 'cancelled' | undefined,
    providerId,
    page,
    limit,
  });

  logger.info('Shipment list fetched', { adminId: admin.id, total: result.total });

  return paginatedResponse(result.shipments, page, limit, result.total);
});

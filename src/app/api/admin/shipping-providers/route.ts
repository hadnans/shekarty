// GGH Admin Shipping Providers — GET list, POST create/update
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-shipping-providers');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const providerCreateSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  code: z.string().min(1),
  apiEndpoint: z.string().default(''),
  apiKey: z.string().default(''),
  isActive: z.boolean().default(true),
});

const providerUpdateSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  apiEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// GET — List all shipping providers
// ============================================

export const GET = apiHandler(async (_request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const providers = await db.shippingProvider.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      shipments: { select: { id: true } },
    },
  });

  const providersList = providers.map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    code: p.code,
    apiEndpoint: p.apiEndpoint,
    apiKey: p.apiKey ? 'configured' : '', // Don't expose actual key
    isActive: p.isActive,
    shipmentsCount: p.shipments.length,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  logger.info('Shipping providers listed', { adminId: admin.id, count: providers.length });

  return successResponse(providersList, 'Shipping providers retrieved');
});

// ============================================
// POST — Create or update shipping provider
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();

  // Check if this is an update (has id field) or create (no id field)
  if (body.id) {
    // Update existing provider
    const parsed = providerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid provider update data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const existing = await db.shippingProvider.findUnique({ where: { id: data.id } });
    if (!existing) {
      throw new ValidationError('Shipping provider not found', 'PROVIDER_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {};
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
    if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
    if (data.apiEndpoint !== undefined) updateData.apiEndpoint = data.apiEndpoint;
    if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await db.shippingProvider.update({
      where: { id: data.id },
      data: updateData,
    });

    logger.info('Shipping provider updated', { adminId: admin.id, providerId: data.id });

    return successResponse({
      id: updated.id,
      nameEn: updated.nameEn,
      nameAr: updated.nameAr,
      code: updated.code,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    }, 'Shipping provider updated');
  }

  // Create new provider
  const parsed = providerCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid provider create data', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  // Check code uniqueness
  const existingCode = await db.shippingProvider.findUnique({ where: { code: data.code } });
  if (existingCode) {
    throw new ConflictError(`Shipping provider code "${data.code}" already exists`, 'PROVIDER_CODE_EXISTS');
  }

  const provider = await db.shippingProvider.create({
    data,
  });

  logger.info('Shipping provider created', { adminId: admin.id, providerId: provider.id, code: data.code });

  return successResponse({
    id: provider.id,
    nameEn: provider.nameEn,
    nameAr: provider.nameAr,
    code: provider.code,
    apiEndpoint: provider.apiEndpoint,
    isActive: provider.isActive,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  }, 'Shipping provider created', 201);
});

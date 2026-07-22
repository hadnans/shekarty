// GGH Admin — Price Rule Detail
// GET, PATCH, DELETE single price rule

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminPriceRuleUpdateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-price-rule-detail');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') || '';

  // Extract id from URL path segments
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const ruleId = segments[segments.length - 2] || id;

  if (!ruleId) {
    throw new NotFoundError('Price rule ID required');
  }

  const priceRule = await db.priceRule.findUnique({
    where: { id: ruleId },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      category: {
        select: { id: true, nameEn: true, nameAr: true },
      },
      product: {
        select: { id: true, nameEn: true, nameAr: true },
      },
      zone: {
        select: { id: true, nameEn: true, nameAr: true },
      },
    },
  });

  if (!priceRule || priceRule.deletedAt) {
    throw new NotFoundError('Price rule not found');
  }

  logger.info('Admin price rule detail', {
    adminId: admin.id,
    priceRuleId: ruleId,
  });

  return successResponse(priceRule);
});

export const PATCH = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Extract id from URL path segments
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const ruleId = segments[segments.length - 2];

  if (!ruleId) {
    throw new NotFoundError('Price rule ID required');
  }

  const existingRule = await db.priceRule.findUnique({
    where: { id: ruleId },
  });

  if (!existingRule || existingRule.deletedAt) {
    throw new NotFoundError('Price rule not found');
  }

  const body = await request.json();
  const validated = adminPriceRuleUpdateSchema.parse(body);

  // Build update data from validated fields
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(validated)) {
    if (value !== undefined) {
      if (key === 'startsAt' || key === 'endsAt') {
        updateData[key] = value ? new Date(value as string) : null;
      } else {
        updateData[key] = value;
      }
    }
  }

  const updatedRule = await db.priceRule.update({
    where: { id: ruleId },
    data: updateData,
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      category: {
        select: { id: true, nameEn: true, nameAr: true },
      },
      product: {
        select: { id: true, nameEn: true, nameAr: true },
      },
      zone: {
        select: { id: true, nameEn: true, nameAr: true },
      },
    },
  });

  logger.info('Admin price rule updated', {
    adminId: admin.id,
    priceRuleId: ruleId,
  });

  return successResponse(updatedRule, 'Price rule updated successfully');
});

export const DELETE = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Extract id from URL path segments
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const ruleId = segments[segments.length - 2];

  if (!ruleId) {
    throw new NotFoundError('Price rule ID required');
  }

  const existingRule = await db.priceRule.findUnique({
    where: { id: ruleId },
  });

  if (!existingRule || existingRule.deletedAt) {
    throw new NotFoundError('Price rule not found');
  }

  // Soft delete
  await db.priceRule.update({
    where: { id: ruleId },
    data: { deletedAt: new Date() },
  });

  logger.info('Admin price rule deleted', {
    adminId: admin.id,
    priceRuleId: ruleId,
  });

  return successResponse({ id: ruleId }, 'Price rule deleted successfully');
});

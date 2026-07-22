// GGH Admin Deals — Single deal: GET, PATCH (update), DELETE
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminDealUpdateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-deals-detail');

// ============================================
// GET — Single deal with product info
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          handle: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          imageUrl: true,
          thumbnailUrl: true,
          todayPrice: true,
          stock: true,
          isActive: true,
          category: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
            },
          },
        },
      },
    },
  });

  if (!deal) {
    throw new NotFoundError('Deal not found', 'DEAL_NOT_FOUND');
  }

  logger.info('Admin deal detail fetched', {
    adminId: admin.id,
    dealId: id,
  });

  return successResponse(deal, 'Deal retrieved');
});

// ============================================
// PATCH — Update deal (partial)
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Verify deal exists
  const existing = await db.deal.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Deal not found', 'DEAL_NOT_FOUND');
  }

  const body = await request.json();
  const parsed = adminDealUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid deal data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const updateData = parsed.data;

  // If productId is being updated, verify product exists
  if (updateData.productId && updateData.productId !== existing.productId) {
    const product = await db.product.findUnique({
      where: { id: updateData.productId },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
    }
  }

  // Determine final prices for discount calculation
  const finalDealPrice = updateData.dealPrice ?? existing.dealPrice;
  const finalOriginalPrice = updateData.originalPrice ?? existing.originalPrice;

  // Auto-recalculate discountPercent if prices change
  let discountPercent: number | undefined;
  if (updateData.dealPrice !== undefined || updateData.originalPrice !== undefined) {
    if (finalDealPrice >= finalOriginalPrice) {
      throw new ValidationError(
        'Deal price must be less than original price',
        'INVALID_DEAL_PRICE'
      );
    }
    discountPercent = Math.round(
      ((finalOriginalPrice - finalDealPrice) / finalOriginalPrice) * 100
    );
  }

  // Build update data with date conversions
  const processedData: Record<string, unknown> = { ...updateData };
  if (discountPercent !== undefined) {
    processedData.discountPercent = discountPercent;
  }
  if (updateData.startsAt) {
    processedData.startsAt = new Date(updateData.startsAt);
  }
  if (updateData.endsAt) {
    processedData.endsAt = new Date(updateData.endsAt);
  }

  // Validate dates if both are provided or one changes
  const finalStartsAt = updateData.startsAt ? new Date(updateData.startsAt) : existing.startsAt;
  const finalEndsAt = updateData.endsAt ? new Date(updateData.endsAt) : existing.endsAt;
  if (finalEndsAt <= finalStartsAt) {
    throw new ValidationError(
      'Deal end date must be after start date',
      'INVALID_DEAL_DATES'
    );
  }

  const deal = await db.deal.update({
    where: { id },
    data: processedData,
    include: {
      product: {
        select: {
          id: true,
          handle: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          todayPrice: true,
          category: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
            },
          },
        },
      },
    },
  });

  // If deal becomes active, update product's isDeal flag
  if (updateData.isActive === true) {
    await db.product.update({
      where: { id: deal.productId },
      data: {
        isDeal: true,
        dealEndsAt: deal.endsAt,
      },
    });
  } else if (updateData.isActive === false) {
    // Check if the product has other active deals
    const otherActiveDeals = await db.deal.count({
      where: {
        productId: deal.productId,
        isActive: true,
        endsAt: { gte: new Date() },
        id: { not: id },
      },
    });

    if (otherActiveDeals === 0) {
      await db.product.update({
        where: { id: deal.productId },
        data: { isDeal: false, dealEndsAt: null },
      });
    }
  }

  logger.info('Deal updated', {
    adminId: admin.id,
    dealId: id,
    updatedFields: Object.keys(updateData),
    discountPercent,
  });

  return successResponse(deal, 'Deal updated');
});

// ============================================
// DELETE — Delete deal (hard delete, no soft delete field)
// ============================================

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Verify deal exists
  const existing = await db.deal.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Deal not found', 'DEAL_NOT_FOUND');
  }

  // Delete the deal (hard delete — Deal model has no deletedAt field)
  await db.deal.delete({ where: { id } });

  // Check if the product has other active deals
  const otherActiveDeals = await db.deal.count({
    where: {
      productId: existing.productId,
      isActive: true,
      endsAt: { gte: new Date() },
    },
  });

  if (otherActiveDeals === 0) {
    await db.product.update({
      where: { id: existing.productId },
      data: { isDeal: false, dealEndsAt: null },
    });
  }

  logger.info('Deal deleted', {
    adminId: admin.id,
    dealId: id,
    productId: existing.productId,
  });

  return successResponse({ id }, 'Deal deleted');
});

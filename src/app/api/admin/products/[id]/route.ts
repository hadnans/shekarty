// GGH Admin Products — Single product: GET, PATCH (update), DELETE (soft delete)
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminProductUpdateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-products-detail');

// ============================================
// GET — Single product by ID
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          color: true,
        },
      },
      productImages: {
        select: {
          id: true,
          url: true,
          altEn: true,
          altAr: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
      deals: {
        select: {
          id: true,
          dealPrice: true,
          originalPrice: true,
          discountPercent: true,
          startsAt: true,
          endsAt: true,
          maxQuantity: true,
          claimedCount: true,
          isActive: true,
        },
      },
    },
  });

  if (!product || product.deletedAt) {
    throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  logger.info('Admin product detail fetched', {
    adminId: admin.id,
    productId: id,
  });

  return successResponse(product, 'Product retrieved');
});

// ============================================
// PATCH — Update product (partial)
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Verify product exists and is not soft-deleted
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const body = await request.json();
  const parsed = adminProductUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid product data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const updateData = parsed.data;

  // If handle is being updated, check uniqueness
  if (updateData.handle && updateData.handle !== existing.handle) {
    const handleExists = await db.product.findUnique({
      where: { handle: updateData.handle },
    });
    if (handleExists && !handleExists.deletedAt) {
      throw new ConflictError(`Product handle "${updateData.handle}" already exists`, 'HANDLE_EXISTS');
    }
  }

  // If categoryId is being updated, verify it exists
  if (updateData.categoryId && updateData.categoryId !== existing.categoryId) {
    const category = await db.category.findUnique({
      where: { id: updateData.categoryId },
    });
    if (!category || category.deletedAt) {
      throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
    }
  }

  // Convert date strings to Date objects
  const processedData: Record<string, unknown> = { ...updateData };
  if (updateData.dealEndsAt) {
    processedData.dealEndsAt = new Date(updateData.dealEndsAt);
  }

  const product = await db.product.update({
    where: { id },
    data: processedData,
    include: {
      category: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
        },
      },
    },
  });

  logger.info('Product updated', {
    adminId: admin.id,
    productId: id,
    updatedFields: Object.keys(updateData),
  });

  return successResponse(product, 'Product updated');
});

// ============================================
// DELETE — Soft delete (set deletedAt)
// ============================================

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Verify product exists and is not already soft-deleted
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  // Soft delete
  await db.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  logger.info('Product soft-deleted', {
    adminId: admin.id,
    productId: id,
    handle: existing.handle,
  });

  return successResponse({ id }, 'Product deleted');
});

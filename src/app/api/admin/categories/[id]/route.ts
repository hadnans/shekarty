// GGH Admin Categories — Single category: GET, PATCH (update), DELETE (soft delete)
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminCategoryUpdateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-categories-detail');

// ============================================
// GET — Single category with products
// ============================================

export const GET = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  const category = await db.category.findUnique({
    where: { id },
    include: {
      parent: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
        },
      },
      children: {
        where: { deletedAt: null },
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          sortOrder: true,
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
      products: {
        where: { deletedAt: null },
        select: {
          id: true,
          handle: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          todayPrice: true,
          stock: true,
          isActive: true,
          totalSold: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!category || category.deletedAt) {
    throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
  }

  logger.info('Admin category detail fetched', {
    adminId: admin.id,
    categoryId: id,
  });

  return successResponse(category, 'Category retrieved');
});

// ============================================
// PATCH — Update category (partial)
// ============================================

export const PATCH = apiHandler(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Verify category exists and is not soft-deleted
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
  }

  const body = await request.json();
  const parsed = adminCategoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid category data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const updateData = parsed.data;

  // If slug is being updated, check uniqueness
  if (updateData.slug && updateData.slug !== existing.slug) {
    const slugExists = await db.category.findUnique({
      where: { slug: updateData.slug },
    });
    if (slugExists && !slugExists.deletedAt) {
      throw new ConflictError(`Category slug "${updateData.slug}" already exists`, 'SLUG_EXISTS');
    }
  }

  // If parentId is being updated, verify parent exists and prevent circular references
  if (updateData.parentId && updateData.parentId !== existing.parentId) {
    if (updateData.parentId === id) {
      throw new ValidationError('A category cannot be its own parent', 'CIRCULAR_REFERENCE');
    }

    const parent = await db.category.findUnique({
      where: { id: updateData.parentId },
    });
    if (!parent || parent.deletedAt) {
      throw new NotFoundError('Parent category not found', 'PARENT_NOT_FOUND');
    }

    // Check for circular reference — walk up the parent chain
    let currentParentId: string | null = updateData.parentId;
    const visitedIds = new Set<string>();
    while (currentParentId) {
      if (currentParentId === id) {
        throw new ValidationError('Circular reference detected in parent chain', 'CIRCULAR_REFERENCE');
      }
      if (visitedIds.has(currentParentId)) break; // safety
      visitedIds.add(currentParentId);
      const parentNode: { parentId: string | null } | null = await db.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      currentParentId = parentNode?.parentId ?? null;
    }
  }

  const category = await db.category.update({
    where: { id },
    data: updateData,
    include: {
      parent: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
        },
      },
      children: {
        where: { deletedAt: null },
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  logger.info('Category updated', {
    adminId: admin.id,
    categoryId: id,
    updatedFields: Object.keys(updateData),
  });

  return successResponse(category, 'Category updated');
});

// ============================================
// DELETE — Soft delete category (check for child products first)
// ============================================

export const DELETE = apiHandler(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdminAuthOrThrow();
  const { id } = await context.params;

  // Verify category exists and is not already soft-deleted
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
  }

  // Check for active child products
  const activeProductCount = await db.product.count({
    where: {
      categoryId: id,
      deletedAt: null,
    },
  });

  if (activeProductCount > 0) {
    throw new ValidationError(
      `Cannot delete category with ${activeProductCount} active products. Move or delete products first.`,
      'CATEGORY_HAS_PRODUCTS',
      { activeProductCount }
    );
  }

  // Check for active child categories
  const activeChildCount = await db.category.count({
    where: {
      parentId: id,
      deletedAt: null,
    },
  });

  if (activeChildCount > 0) {
    throw new ValidationError(
      `Cannot delete category with ${activeChildCount} active child categories. Move or delete children first.`,
      'CATEGORY_HAS_CHILDREN',
      { activeChildCount }
    );
  }

  // Soft delete
  await db.category.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  logger.info('Category soft-deleted', {
    adminId: admin.id,
    categoryId: id,
    slug: existing.slug,
  });

  return successResponse({ id }, 'Category deleted');
});

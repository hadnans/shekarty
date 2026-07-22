// GGH Admin Categories — List all as tree + Create new category
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminCategoryCreateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-categories');

// ============================================
// HELPER — Build category tree with productCount
// ============================================

interface CategoryNode {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  productCount: number;
  children: CategoryNode[];
  createdAt: Date;
  updatedAt: Date;
}

function buildCategoryTree(
  categories: Array<{
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    icon: string;
    color: string;
    sortOrder: number;
    isActive: boolean;
    parentId: string | null;
    productCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>
): CategoryNode[] {
  const nodeMap = new Map<string, CategoryNode>();
  const rootNodes: CategoryNode[] = [];

  // Create node for each category
  for (const cat of categories) {
    nodeMap.set(cat.id, {
      ...cat,
      children: [],
    });
  }

  // Build tree
  for (const cat of categories) {
    const node = nodeMap.get(cat.id)!;
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      nodeMap.get(cat.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  // Sort children by sortOrder
  const sortChildren = (nodes: CategoryNode[]): CategoryNode[] => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const node of nodes) {
      sortChildren(node.children);
    }
    return nodes;
  };

  return sortChildren(rootNodes);
}

// ============================================
// GET — All categories as tree (with productCount)
// ============================================

export const GET = apiHandler(async (_request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Fetch all non-deleted categories with product count
  const categories = await db.category.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      products: {
        where: { deletedAt: null },
        select: { id: true },
      },
    },
  });

  // Transform to include productCount
  const flatCategories = categories.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    nameEn: cat.nameEn,
    nameAr: cat.nameAr,
    descriptionEn: cat.descriptionEn,
    descriptionAr: cat.descriptionAr,
    icon: cat.icon,
    color: cat.color,
    sortOrder: cat.sortOrder,
    isActive: cat.isActive,
    parentId: cat.parentId,
    productCount: cat.products.length,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  }));

  // Build tree
  const tree = buildCategoryTree(flatCategories);

  logger.info('Admin categories tree fetched', {
    adminId: admin.id,
    totalCategories: flatCategories.length,
  });

  return successResponse(tree, 'Categories tree retrieved');
});

// ============================================
// POST — Create new category
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = adminCategoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid category data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  // Check slug uniqueness
  const existingSlug = await db.category.findUnique({
    where: { slug: data.slug },
  });
  if (existingSlug && !existingSlug.deletedAt) {
    throw new ConflictError(`Category slug "${data.slug}" already exists`, 'SLUG_EXISTS');
  }

  // If parentId provided, verify parent exists
  if (data.parentId) {
    const parent = await db.category.findUnique({
      where: { id: data.parentId },
    });
    if (!parent || parent.deletedAt) {
      throw new NotFoundError('Parent category not found', 'PARENT_NOT_FOUND');
    }
  }

  // If slug exists but was soft-deleted, restore it
  if (existingSlug && existingSlug.deletedAt) {
    const restored = await db.category.update({
      where: { slug: data.slug },
      data: {
        ...data,
        deletedAt: null,
        isActive: data.isActive ?? true,
      },
    });

    logger.info('Soft-deleted category restored via create', {
      adminId: admin.id,
      categoryId: restored.id,
      slug: data.slug,
    });

    return successResponse(restored, 'Category created (restored from soft delete)', 201);
  }

  // Create new category
  const category = await db.category.create({
    data,
  });

  logger.info('Category created', {
    adminId: admin.id,
    categoryId: category.id,
    slug: data.slug,
  });

  return successResponse(category, 'Category created successfully', 201);
});

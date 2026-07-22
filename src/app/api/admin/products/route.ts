// GGH Admin Products — List (paginated) + Create endpoints
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse, paginatedResponse } from '@/lib/ggh/auth';
import { adminProductListSchema, adminProductCreateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const logger = createLogger('admin-products');

// ============================================
// GET — Paginated product list
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsed = adminProductListSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid query parameters',
      'INVALID_PARAMS',
      parsed.error.flatten().fieldErrors
    );
  }

  const { page, limit, search, status, categoryId, sortBy, sortOrder } = parsed.data;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  // Status filter
  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  }

  // Category filter
  if (categoryId) {
    where.categoryId = categoryId;
  }

  // Search filter
  if (search) {
    where.OR = [
      { nameEn: { contains: search } },
      { nameAr: { contains: search } },
      { brandEn: { contains: search } },
      { brandAr: { contains: search } },
      { handle: { contains: search } },
      { barcode: { contains: search } },
    ];
  }

  // Build order by
  let orderBy: Prisma.ProductOrderByWithRelationInput;
  switch (sortBy) {
    case 'name':
      orderBy = { nameEn: sortOrder };
      break;
    case 'price':
      orderBy = { todayPrice: sortOrder };
      break;
    case 'stock':
      orderBy = { stock: sortOrder };
      break;
    case 'sold':
      orderBy = { totalSold: sortOrder };
      break;
    case 'createdAt':
    default:
      orderBy = { createdAt: sortOrder };
      break;
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        deals: {
          where: { isActive: true },
          select: {
            id: true,
            dealPrice: true,
            originalPrice: true,
            discountPercent: true,
            endsAt: true,
          },
          take: 1,
        },
      },
    }),
    db.product.count({ where }),
  ]);

  logger.info('Admin products list fetched', {
    adminId: admin.id,
    page,
    limit,
    total,
    search,
    status,
    categoryId,
  });

  return paginatedResponse(products, page, limit, total);
});

// ============================================
// POST — Create a new product
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = adminProductCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid product data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  // Verify category exists
  const category = await db.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category || category.deletedAt) {
    throw new NotFoundError('Category not found', 'CATEGORY_NOT_FOUND');
  }

  // Check handle uniqueness
  const existingHandle = await db.product.findUnique({
    where: { handle: data.handle },
  });
  if (existingHandle && !existingHandle.deletedAt) {
    throw new ConflictError(`Product handle "${data.handle}" already exists`, 'HANDLE_EXISTS');
  }

  // If handle exists but was soft-deleted, restore it
  if (existingHandle && existingHandle.deletedAt) {
    const restored = await db.product.update({
      where: { handle: data.handle },
      data: {
        ...data,
        dealEndsAt: data.dealEndsAt ? new Date(data.dealEndsAt) : null,
        deletedAt: null,
        isActive: data.isActive ?? true,
      },
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

    logger.info('Soft-deleted product restored via create', {
      adminId: admin.id,
      productId: restored.id,
      handle: data.handle,
    });

    return successResponse(restored, 'Product created (restored from soft delete)', 201);
  }

  // Create new product
  const product = await db.product.create({
    data: {
      ...data,
      dealEndsAt: data.dealEndsAt ? new Date(data.dealEndsAt) : null,
    },
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

  logger.info('Product created', {
    adminId: admin.id,
    productId: product.id,
    handle: data.handle,
  });

  return successResponse(product, 'Product created successfully', 201);
});

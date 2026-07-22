// GGH Search — Search products and categories
// With rate limiting, caching, Zod validation, structured logging, and apiHandler

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse } from '@/lib/ggh/auth';
import { apiHandler, ValidationError, RateLimitError } from '@/lib/errors';
import { searchLimiter } from '@/lib/rate-limit';
import { productCache, cacheKey } from '@/lib/cache';
import { searchSchema } from '@/lib/validation';
import { createLogger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const logger = createLogger('search');

export const GET = apiHandler(async (request: NextRequest) => {
  // Rate limiting
  const rateLimitResult = searchLimiter.middleware()(request);
  if (rateLimitResult) {
    throw new RateLimitError('Too many search requests. Please try again later.');
  }

  const { searchParams } = new URL(request.url);

  // Validate query parameters with Zod
  const rawParams = {
    q: searchParams.get('q') ?? '',
    lang: searchParams.get('lang') ?? undefined,
  };
  const parsed = searchSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid search parameters',
      'INVALID_SEARCH',
      parsed.error.flatten().fieldErrors
    );
  }

  const { q: query, lang } = parsed.data;
  const searchTerm = query.trim();

  // Check cache
  const cKey = cacheKey('search', searchTerm, lang ?? 'en');
  const cached = productCache.get<unknown>(cKey);
  if (cached) {
    logger.debug('Search served from cache', { query: searchTerm });
    return successResponse(cached);
  }

  // Search products
  const productWhere: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
    OR: [
      { nameEn: { contains: searchTerm } },
      { nameAr: { contains: searchTerm } },
      { brandEn: { contains: searchTerm } },
      { brandAr: { contains: searchTerm } },
      { handle: { contains: searchTerm } },
    ],
  };

  const categoryWhere: Prisma.CategoryWhereInput = {
    isActive: true,
    deletedAt: null,
    OR: [
      { nameEn: { contains: searchTerm } },
      { nameAr: { contains: searchTerm } },
      { slug: { contains: searchTerm } },
    ],
  };

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      take: 20,
      orderBy: { totalSold: 'desc' },
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
      },
    }),
    db.category.findMany({
      where: categoryWhere,
      take: 10,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: { where: { isActive: true, deletedAt: null } },
          },
        },
      },
    }),
  ]);

  const totalProducts = await db.product.count({ where: productWhere });
  const totalCategories = await db.category.count({ where: categoryWhere });

  const result = {
    products,
    categories: categories.map((cat) => ({
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
      productCount: cat._count.products,
    })),
    totalProducts,
    totalCategories,
  };

  // Cache the result (reuse productCache with shorter TTL — search results change less often)
  productCache.set(cKey, result, 2 * 60 * 1000); // 2 min TTL for search

  logger.info('Search completed', {
    query: searchTerm,
    totalProducts,
    totalCategories,
  });

  return successResponse(result);
});

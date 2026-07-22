// GGH Products — List products with pagination, filtering, sorting
// With caching, Zod validation, structured logging, and apiHandler

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { paginatedResponse } from '@/lib/ggh/auth';
import { apiHandler, ValidationError } from '@/lib/errors';
import { productCache, cacheKey } from '@/lib/cache';
import { productListSchema } from '@/lib/validation';
import { createLogger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const logger = createLogger('products');

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // Validate query parameters with Zod
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsed = productListSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid query parameters',
      'INVALID_PARAMS',
      parsed.error.flatten().fieldErrors
    );
  }

  const { page, limit, categoryId, search, sort, featured, deals } = parsed.data;
  const skip = (page - 1) * limit;

  // Build cache key
  const cKey = cacheKey('products', `p${page}`, `l${limit}`, sort, categoryId ?? 'all', search ?? 'none', featured ?? 'none', deals ?? 'none');

  // Try cache first
  const cached = productCache.get<{ products: unknown[]; total: number }>(cKey);
  if (cached) {
    logger.debug('Products served from cache', { page, limit });
    return paginatedResponse(cached.products, page, limit, cached.total);
  }

  // Build where clause
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
  };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (search) {
    where.OR = [
      { nameEn: { contains: search } },
      { nameAr: { contains: search } },
      { brandEn: { contains: search } },
      { brandAr: { contains: search } },
      { handle: { contains: search } },
    ];
  }

  if (featured === 'true') {
    where.isFeatured = true;
  }

  if (deals === 'true') {
    where.isDeal = true;
  }

  // Build order by
  let orderBy: Prisma.ProductOrderByWithRelationInput = { totalSold: 'desc' };
  switch (sort) {
    case 'price_asc':
      orderBy = { todayPrice: 'asc' };
      break;
    case 'price_desc':
      orderBy = { todayPrice: 'desc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
    case 'rating':
      orderBy = { rating: 'desc' };
      break;
    case 'popular':
    default:
      orderBy = { totalSold: 'desc' };
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
      },
    }),
    db.product.count({ where }),
  ]);

  // Cache the result
  productCache.set(cKey, { products, total });

  logger.info('Products fetched', { page, limit, total, sort });

  return paginatedResponse(products, page, limit, total);
});

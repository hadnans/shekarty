// GGH Categories — List all active categories with product counts
// With caching, structured logging, and apiHandler

import { db } from '@/lib/db';
import { successResponse } from '@/lib/ggh/auth';
import { apiHandler } from '@/lib/errors';
import { categoryCache, cacheKey } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('categories');

export const GET = apiHandler(async () => {
  // Check cache
  const cKey = cacheKey('categories', 'all');
  const cached = categoryCache.get<unknown[]>(cKey);
  if (cached) {
    logger.debug('Categories served from cache');
    return successResponse(cached);
  }

  const categories = await db.category.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          products: {
            where: { isActive: true, deletedAt: null },
          },
        },
      },
    },
  });

  const categoriesWithCount = categories.map((cat) => ({
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
  }));

  // Cache the result
  categoryCache.set(cKey, categoriesWithCount);

  logger.info('Categories fetched', { count: categories.length });

  return successResponse(categoriesWithCount);
});

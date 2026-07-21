// GGH Deals — List active deals with products
// With caching, structured logging, and apiHandler

import { db } from '@/lib/db';
import { successResponse } from '@/lib/ggh/auth';
import { apiHandler } from '@/lib/errors';
import { productCache, cacheKey } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('deals');

export const GET = apiHandler(async () => {
  // Check cache
  const cKey = cacheKey('deals', 'active');
  const cached = productCache.get<unknown[]>(cKey);
  if (cached) {
    logger.debug('Deals served from cache');
    return successResponse(cached);
  }

  const deals = await db.deal.findMany({
    where: {
      isActive: true,
      startsAt: { lte: new Date() },
      endsAt: { gt: new Date() },
    },
    orderBy: { discountPercent: 'desc' },
  });

  // Fetch products separately to avoid relation issues during dev hot reload
  const productIds = deals.map((d) => d.productId);
  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
      deletedAt: null,
    },
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
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const dealsWithProducts = deals.map((deal) => ({
    ...deal,
    product: productMap.get(deal.productId) || null,
  }));

  // Cache the result
  productCache.set(cKey, dealsWithProducts);

  logger.info('Deals fetched', { count: deals.length });

  return successResponse(dealsWithProducts);
});

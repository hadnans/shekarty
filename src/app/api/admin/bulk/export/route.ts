// GGH Admin — Bulk Export
// GET: Generate export data for products/categories/inventory/customers
// Returns JSON data (frontend converts to CSV)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-bulk-export');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'products'; // products | categories | inventory | customers
  const format = searchParams.get('format') || 'json'; // json (frontend converts to CSV)
  const isActive = searchParams.get('isActive') || 'all';

  const validTypes = ['products', 'categories', 'inventory', 'customers'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(`Invalid export type. Must be: ${validTypes.join(', ')}`, 'INVALID_TYPE');
  }

  // Build filter for isActive
  const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
  const whereBase: Record<string, unknown> = { deletedAt: null };
  if (activeFilter !== undefined) {
    whereBase.isActive = activeFilter;
  }

  let data: unknown[];

  switch (type) {
    case 'products': {
      const products = await db.product.findMany({
        where: whereBase,
        orderBy: { nameEn: 'asc' },
        select: {
          id: true,
          handle: true,
          nameEn: true,
          nameAr: true,
          descriptionEn: true,
          descriptionAr: true,
          brandEn: true,
          brandAr: true,
          weight: true,
          unit: true,
          barcode: true,
          todayPrice: true,
          yesterdayPrice: true,
          wholesalePrice: true,
          costPrice: true,
          compareAtPrice: true,
          stock: true,
          lowStockThreshold: true,
          totalSold: true,
          isActive: true,
          isFeatured: true,
          isDeal: true,
          maxPerOrder: true,
          minOrderQty: true,
          category: { select: { nameEn: true, slug: true } },
          createdAt: true,
          updatedAt: true,
        },
      });
      data = products.map((p) => ({
        ...p,
        categoryName: p.category?.nameEn || '',
        categorySlug: p.category?.slug || '',
        category: undefined,
      }));
      break;
    }

    case 'categories': {
      data = await db.category.findMany({
        where: whereBase,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
          descriptionEn: true,
          descriptionAr: true,
          icon: true,
          color: true,
          sortOrder: true,
          isActive: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      break;
    }

    case 'inventory': {
      const inventory = await db.product.findMany({
        where: whereBase,
        orderBy: { nameEn: 'asc' },
        select: {
          id: true,
          handle: true,
          nameEn: true,
          nameAr: true,
          barcode: true,
          stock: true,
          lowStockThreshold: true,
          costPrice: true,
          todayPrice: true,
          unit: true,
          isActive: true,
          category: { select: { nameEn: true } },
        },
      });
      data = inventory.map((p) => ({
        id: p.id,
        handle: p.handle,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        barcode: p.barcode || '',
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        costPrice: p.costPrice || 0,
        todayPrice: p.todayPrice,
        unit: p.unit,
        stockValue: p.stock * (p.costPrice || p.todayPrice),
        isActive: p.isActive,
        categoryName: p.category?.nameEn || '',
      }));
      break;
    }

    case 'customers': {
      const customers = await db.customer.findMany({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          nameAr: true,
          preferredLang: true,
          wholesaleStatus: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      // Get order stats for each customer
      const customerStats = await db.order.groupBy({
        by: ['customerId'],
        _count: { id: true },
        _sum: { totalAmount: true },
        where: { deletedAt: null },
      });

      const statsMap = new Map(
        customerStats.map((s) => [s.customerId, { orderCount: s._count.id, totalSpent: s._sum.totalAmount || 0 }])
      );

      data = customers.map((c) => ({
        ...c,
        orderCount: statsMap.get(c.id)?.orderCount || 0,
        totalSpent: statsMap.get(c.id)?.totalSpent || 0,
      }));
      break;
    }

    default:
      throw new ValidationError('Invalid export type', 'INVALID_TYPE');
  }

  logger.info('Admin bulk export', {
    adminId: admin.id,
    type,
    recordCount: data.length,
  });

  return successResponse({
    type,
    format,
    count: data.length,
    data,
    exportedAt: new Date().toISOString(),
  }, 'Export generated successfully');
});

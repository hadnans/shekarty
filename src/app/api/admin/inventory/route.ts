// GGH Admin — Inventory Overview
// GET: Inventory with low stock alerts, stock levels, search, filters

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-inventory');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const stockFilter = searchParams.get('stockFilter') || 'all'; // all | low | out | ok
  const sortBy = searchParams.get('sortBy') || 'stock';
  const sortOrder = searchParams.get('sortOrder') || 'asc';

  if (page < 1 || limit < 1 || limit > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    where.OR = [
      { nameEn: { contains: search } },
      { nameAr: { contains: search } },
      { handle: { contains: search } },
      { barcode: { contains: search } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  // Stock filter logic
  if (stockFilter === 'out') {
    where.stock = 0;
  }

  // Determine sort order direction
  const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  const orderBy: Record<string, string> = {};
  if (sortBy === 'stock') orderBy.stock = orderDirection;
  else if (sortBy === 'name') orderBy.nameEn = orderDirection;
  else if (sortBy === 'price') orderBy.todayPrice = orderDirection;
  else if (sortBy === 'sold') orderBy.totalSold = orderDirection;
  else orderBy.createdAt = orderDirection;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        handle: true,
        nameEn: true,
        nameAr: true,
        barcode: true,
        todayPrice: true,
        wholesalePrice: true,
        costPrice: true,
        stock: true,
        lowStockThreshold: true,
        totalSold: true,
        isActive: true,
        unit: true,
        weight: true,
        icon: true,
        thumbnailUrl: true,
        categoryId: true,
        category: {
          select: { id: true, nameEn: true, nameAr: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.product.count({ where }),
  ]);

  // Enrich with stock status
  let enrichedProducts = products.map((p) => {
    let stockStatus: 'ok' | 'low' | 'out' = 'ok';
    if (p.stock === 0) stockStatus = 'out';
    else if (p.stock <= p.lowStockThreshold) stockStatus = 'low';

    return {
      ...p,
      stockStatus,
      stockValue: p.stock * (p.costPrice || p.todayPrice),
    };
  });

  // Apply low stock filter in code (cross-field comparison not supported in SQLite)
  if (stockFilter === 'low') {
    enrichedProducts = enrichedProducts.filter((p) => p.stockStatus === 'low');
  } else if (stockFilter === 'ok') {
    enrichedProducts = enrichedProducts.filter((p) => p.stockStatus === 'ok');
  }

  // Low stock alerts — products needing attention
  const lowStockAlerts = await db.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      stock: { lte: 10 },
    },
    orderBy: { stock: 'asc' },
    take: 20,
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      stock: true,
      lowStockThreshold: true,
      unit: true,
      icon: true,
      thumbnailUrl: true,
    },
  });

  // Summary stats
  const totalProducts = await db.product.count({
    where: { deletedAt: null },
  });
  const outOfStockCount = await db.product.count({
    where: { deletedAt: null, stock: 0 },
  });
  const lowStockCount = await db.product.count({
    where: { deletedAt: null, isActive: true, stock: { lte: 10, gt: 0 } },
  });

  logger.info('Admin inventory overview', {
    adminId: admin.id,
    page,
    limit,
    total,
    filters: { search, stockFilter, categoryId },
  });

  return NextResponse.json({
    success: true,
    data: enrichedProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      totalProducts,
      outOfStockCount,
      lowStockCount,
    },
    lowStockAlerts,
  });
});

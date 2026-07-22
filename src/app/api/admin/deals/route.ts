// GGH Admin Deals — Paginated list + Create new deal
// Uses apiHandler, requireAdminAuthOrThrow, Zod validation
// Auto-calculates discountPercent from dealPrice and originalPrice

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError, NotFoundError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse, paginatedResponse } from '@/lib/ggh/auth';
import { adminDealCreateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const logger = createLogger('admin-deals');

// ============================================
// GET — Paginated deal list with active/expired filter
// ============================================

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
  const filter = searchParams.get('filter') || 'all'; // all | active | expired

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.DealWhereInput = {};

  const now = new Date();

  if (filter === 'active') {
    where.isActive = true;
    where.endsAt = { gte: now };
  } else if (filter === 'expired') {
    where.OR = [
      { isActive: false },
      { endsAt: { lt: now } },
    ];
  }

  const [deals, total] = await Promise.all([
    db.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            handle: true,
            nameEn: true,
            nameAr: true,
            icon: true,
            imageUrl: true,
            todayPrice: true,
            stock: true,
            isActive: true,
            category: {
              select: {
                id: true,
                nameEn: true,
                nameAr: true,
              },
            },
          },
        },
      },
    }),
    db.deal.count({ where }),
  ]);

  logger.info('Admin deals list fetched', {
    adminId: admin.id,
    page,
    limit,
    total,
    filter,
  });

  return paginatedResponse(deals, page, limit, total);
});

// ============================================
// POST — Create new deal (auto-calculates discountPercent)
// ============================================

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const parsed = adminDealCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid deal data',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;

  // Verify product exists
  const product = await db.product.findUnique({
    where: { id: data.productId },
  });
  if (!product || product.deletedAt) {
    throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  // Auto-calculate discountPercent if not provided or if it needs to be recalculated
  // discountPercent = Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
  const discountPercent = Math.round(
    ((data.originalPrice - data.dealPrice) / data.originalPrice) * 100
  );

  // Validate that deal price is less than original price
  if (data.dealPrice >= data.originalPrice) {
    throw new ValidationError(
      'Deal price must be less than original price',
      'INVALID_DEAL_PRICE',
      { dealPrice: data.dealPrice, originalPrice: data.originalPrice }
    );
  }

  // Validate dates
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (endsAt <= startsAt) {
    throw new ValidationError(
      'Deal end date must be after start date',
      'INVALID_DEAL_DATES'
    );
  }

  // Create deal
  const deal = await db.deal.create({
    data: {
      productId: data.productId,
      dealPrice: data.dealPrice,
      originalPrice: data.originalPrice,
      discountPercent,
      startsAt,
      endsAt,
      maxQuantity: data.maxQuantity,
      isActive: data.isActive,
    },
    include: {
      product: {
        select: {
          id: true,
          handle: true,
          nameEn: true,
          nameAr: true,
          icon: true,
          imageUrl: true,
          todayPrice: true,
          category: {
            select: {
              id: true,
              nameEn: true,
              nameAr: true,
            },
          },
        },
      },
    },
  });

  // Also update the product to mark it as a deal
  await db.product.update({
    where: { id: data.productId },
    data: {
      isDeal: true,
      dealEndsAt: endsAt,
    },
  });

  logger.info('Deal created', {
    adminId: admin.id,
    dealId: deal.id,
    productId: data.productId,
    discountPercent,
  });

  return successResponse(deal, 'Deal created successfully', 201);
});

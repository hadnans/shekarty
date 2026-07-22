// GGH Admin — Price Rules List / Create
// GET: List price rules with filters (active, type, search)
// POST: Create new price rule

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse, paginatedResponse } from '@/lib/ggh/auth';
import { adminPriceRuleCreateSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-price-rules');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || '';
  const isActive = searchParams.get('isActive') || 'all'; // all | true | false

  if (page < 1 || limit < 1 || limit > 100) {
    throw new ValidationError('Invalid pagination parameters');
  }

  // Build where clause
  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    where.nameEn = { contains: search };
  }

  if (type) {
    where.type = type;
  }

  if (isActive === 'true') {
    where.isActive = true;
  } else if (isActive === 'false') {
    where.isActive = false;
  }

  const skip = (page - 1) * limit;

  const [priceRules, total] = await Promise.all([
    db.priceRule.findMany({
      where,
      orderBy: { priority: 'asc' },
      skip,
      take: limit,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        category: {
          select: { id: true, nameEn: true, nameAr: true },
        },
        product: {
          select: { id: true, nameEn: true, nameAr: true },
        },
        zone: {
          select: { id: true, nameEn: true, nameAr: true },
        },
      },
    }),
    db.priceRule.count({ where }),
  ]);

  logger.info('Admin price rules list', {
    adminId: admin.id,
    page,
    limit,
    total,
  });

  return paginatedResponse(priceRules, page, limit, total);
});

export const POST = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const body = await request.json();
  const validated = adminPriceRuleCreateSchema.parse(body);

  const priceRule = await db.priceRule.create({
    data: {
      nameEn: validated.nameEn,
      nameAr: validated.nameAr,
      type: validated.type,
      value: validated.value,
      minQuantity: validated.minQuantity,
      maxQuantity: validated.maxQuantity,
      minOrderTotal: validated.minOrderTotal,
      customerId: validated.customerId,
      customerGroup: validated.customerGroup,
      categoryId: validated.categoryId,
      productId: validated.productId,
      zoneId: validated.zoneId,
      priority: validated.priority,
      startsAt: validated.startsAt ? new Date(validated.startsAt) : null,
      endsAt: validated.endsAt ? new Date(validated.endsAt) : null,
      isActive: validated.isActive,
    },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      category: {
        select: { id: true, nameEn: true, nameAr: true },
      },
      product: {
        select: { id: true, nameEn: true, nameAr: true },
      },
      zone: {
        select: { id: true, nameEn: true, nameAr: true },
      },
    },
  });

  logger.info('Admin price rule created', {
    adminId: admin.id,
    priceRuleId: priceRule.id,
    type: validated.type,
  });

  return successResponse(priceRule, 'Price rule created successfully', 201);
});

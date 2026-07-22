// GGH Categories — Single category by slug with its products

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const category = await db.category.findUnique({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
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
        },
        _count: {
          select: {
            products: { where: { isActive: true, deletedAt: null } },
          },
        },
      },
    });

    if (!category) {
      return errorResponse('Category not found', 'CATEGORY_NOT_FOUND', 404);
    }

    return successResponse({
      id: category.id,
      slug: category.slug,
      nameEn: category.nameEn,
      nameAr: category.nameAr,
      descriptionEn: category.descriptionEn,
      descriptionAr: category.descriptionAr,
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      parentId: category.parentId,
      productCount: category._count.products,
      products: category.products,
    });
  } catch (err) {
    console.error('Category fetch error:', err);
    return errorResponse('Failed to fetch category', 'CATEGORY_FETCH_FAILED', 500);
  }
}

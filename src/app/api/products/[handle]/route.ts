import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    const product = await db.product.findUnique({
      where: { handle, isActive: true, deletedAt: null },
      include: {
        category: true,
        productImages: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        todayPrice: product.todayPrice,
        yesterdayPrice: product.yesterdayPrice,
        wholesalePrice: product.wholesalePrice,
        compareAtPrice: product.compareAtPrice,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

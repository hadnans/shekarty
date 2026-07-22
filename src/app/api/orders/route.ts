// GGH Orders — List user's orders with pagination

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { paginatedResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const customer = authResult;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');

    const where: Prisma.OrderWhereInput = {
      customerId: customer.id,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.order.count({ where }),
    ]);

    return paginatedResponse(orders, page, limit, total);
  } catch (err) {
    console.error('Orders list error:', err);
    return errorResponse('Failed to fetch orders', 'ORDERS_FETCH_FAILED', 500);
  }
}

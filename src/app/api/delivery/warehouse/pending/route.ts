// GET /api/delivery/warehouse/pending — Get orders awaiting packing

import { NextRequest } from 'next/server';
import { getPendingPackingOrders } from '@/lib/delivery/warehouse-ops';
import { successResponse, errorResponse } from '@/lib/ggh/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId') || undefined;

    const orders = await getPendingPackingOrders(warehouseId);
    return successResponse(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pending orders';
    return errorResponse(message, 'FETCH_ERROR', 500);
  }
}

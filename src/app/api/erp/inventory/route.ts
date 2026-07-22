// GGH — ERP Inventory API Route
// GET: stock levels; POST: stock entry

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { getStockLevels, createStockEntry } from '@/lib/erp/modules/inventory';
import { isErpEnabled } from '@/lib/erp/config';
import { z } from 'zod';

/** Schema for stock entry creation */
const stockEntrySchema = z.object({
  entryType: z.enum(['Material Receipt', 'Material Issue', 'Material Transfer', 'Manufacture']),
  items: z.array(z.object({
    itemCode: z.string().min(1),
    qty: z.number().int().positive(),
    rate: z.number().min(0).optional(),
    sourceWarehouse: z.string().optional(),
    targetWarehouse: z.string().optional(),
  })).min(1),
  warehouse: z.string().optional(),
});

/**
 * GET /api/erp/inventory — Get stock levels from ERPNext
 * Query params: itemCode?, warehouse?
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  if (!isErpEnabled()) {
    return successResponse({
      enabled: false,
      stockLevels: [],
      message: 'ERPNext is not configured',
    });
  }

  const { searchParams } = new URL(request.url);
  const itemCode = searchParams.get('itemCode') ?? undefined;
  const warehouse = searchParams.get('warehouse') ?? undefined;

  try {
    const stockLevels = await getStockLevels(itemCode, warehouse);
    return successResponse({ enabled: true, stockLevels });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to get stock levels: ${message}`, 'ERP_ERROR', 500);
  }
}

/**
 * POST /api/erp/inventory — Create a stock entry in ERPNext
 * Body: { entryType, items, warehouse? }
 * Requires authentication.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  if (!isErpEnabled()) {
    return errorResponse('ERPNext is not configured', 'ERP_NOT_CONFIGURED', 503);
  }

  let body: z.infer<typeof stockEntrySchema>;
  try {
    const raw = await request.json();
    body = stockEntrySchema.parse(raw);
  } catch {
    return errorResponse('Invalid request body. Expected: { entryType, items: [{ itemCode, qty, rate?, sourceWarehouse?, targetWarehouse? }], warehouse? }', 'VALIDATION_ERROR', 400);
  }

  try {
    const stockEntryName = await createStockEntry(
      body.entryType,
      body.items,
      body.warehouse,
    );

    if (stockEntryName) {
      return successResponse({ stockEntryName }, 'Stock entry created successfully', 201);
    } else {
      return errorResponse('Failed to create stock entry', 'ERP_ERROR', 500);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to create stock entry: ${message}`, 'ERP_ERROR', 500);
  }
}

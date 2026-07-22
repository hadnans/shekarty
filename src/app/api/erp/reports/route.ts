// GGH — ERP Reports API Route
// GET: dashboard report data

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, requireAuth } from '@/lib/ggh/auth';
import { getSalesSummary, getStockBalance, getTopSellingItems, getProfitReport } from '@/lib/erp/modules/reporting';
import { isErpEnabled } from '@/lib/erp/config';

/**
 * GET /api/erp/reports — Get dashboard report data from ERPNext
 * Query params: type (sales|stock|topSelling|profit), fromDate, toDate, warehouse?, limit?
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof Response) return authResult;

  if (!isErpEnabled()) {
    return successResponse({
      enabled: false,
      data: null,
      message: 'ERPNext is not configured',
    });
  }

  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('type') ?? 'sales';
  const fromDate = searchParams.get('fromDate') ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = searchParams.get('toDate') ?? new Date().toISOString().split('T')[0];
  const warehouse = searchParams.get('warehouse') ?? undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') ?? '10', 10) : 10;

  try {
    switch (reportType) {
      case 'sales': {
        const data = await getSalesSummary(fromDate, toDate);
        return successResponse({ enabled: true, type: 'sales', data });
      }

      case 'stock': {
        const data = await getStockBalance(warehouse);
        return successResponse({ enabled: true, type: 'stock', data });
      }

      case 'topSelling': {
        const data = await getTopSellingItems(limit, fromDate);
        return successResponse({ enabled: true, type: 'topSelling', data });
      }

      case 'profit': {
        const data = await getProfitReport(fromDate, toDate);
        return successResponse({ enabled: true, type: 'profit', data });
      }

      default:
        return errorResponse(
          'Invalid report type. Expected: sales, stock, topSelling, profit',
          'VALIDATION_ERROR',
          400,
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Failed to generate report: ${message}`, 'ERP_ERROR', 500);
  }
}

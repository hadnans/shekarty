// GGH — ERPNext Reporting Module
// Dashboard data: sales summary, stock balance, top selling, profit

import { erpCallMethod, erpGetList } from '../client';
import type {
  ErpStockBalance,
  ErpSalesSummary,
  GghStockLevel,
  GghSalesSummary,
  GghTopSellingItem,
  GghProfitReport,
} from '../types';
import { erpStockBalanceToGgh, erpSalesSummaryToGgh, erpTopSellingItemToGgh, erpProfitReportToGgh } from '../mappers';

/**
 * Get sales summary analytics from ERPNext.
 * Aggregates sales data for a given date range.
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 * @returns GGH sales summary or null if ERP is disabled
 */
export async function getSalesSummary(fromDate: string, toDate: string): Promise<GghSalesSummary | null> {
  // Use ERPNext query report for sales analytics
  const result = await erpCallMethod<ErpSalesSummary>('frappe.desk.query_report.run', {
    report_name: 'Sales Order Analytics',
    filters: {
      from_date: fromDate,
      to_date: toDate,
      company: 'GGH Wholesale',
    },
  });

  if (!result) {
    // Fallback: compute from Sales Order list
    const orders = await erpGetList<{
      grand_total: number;
      total_qty: number;
    }>(
      'Sales Order',
      [
        ['transaction_date', '>=', fromDate],
        ['transaction_date', '<=', toDate],
        ['docstatus', '=', 1],
      ],
      ['grand_total', 'total_qty'],
      0,
      1000,
    );

    if (!orders) return null;

    const totalSales = orders.reduce((sum, o) => sum + o.grand_total, 0);
    const totalOrders = orders.length;
    const totalItems = orders.reduce((sum, o) => sum + o.total_qty, 0);

    return {
      totalSales: { __brand: 'Piastres', ...Object.fromEntries([['value', Math.round(totalSales * 100)]]) } as unknown as GghSalesSummary['totalSales'],
      totalOrders,
      averageOrderValue: { __brand: 'Piastres', ...Object.fromEntries([['value', totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) : 0]]) } as unknown as GghSalesSummary['averageOrderValue'],
      totalItemsSold: totalItems,
      fromDate,
      toDate,
    };
  }

  return erpSalesSummaryToGgh(result);
}

/**
 * Get current stock balance from ERPNext for a specific warehouse or all.
 * @param warehouse - Optional warehouse name filter
 * @returns Array of GGH stock levels or empty array if ERP is disabled
 */
export async function getStockBalance(warehouse?: string): Promise<GghStockLevel[]> {
  const filters: unknown[][] = [];
  if (warehouse) filters.push(['warehouse', '=', warehouse]);

  const balances = await erpGetList<ErpStockBalance>(
    'Bin',
    filters.length > 0 ? filters : undefined,
    ['item_code', 'warehouse', 'actual_qty', 'ordered_qty', 'reserved_qty', 'projected_qty', 'valuation_rate', 'stock_value', 're_order_level'],
    0,
    500,
  );

  if (!balances) return [];

  // Get item names for display
  const itemCodes = [...new Set(balances.map((b) => b.item_code))];
  const itemNameMap = new Map<string, { nameEn: string; nameAr: string }>();

  if (itemCodes.length > 0) {
    const items = await erpGetList<{ item_code: string; item_name: string; item_name_ar?: string }>(
      'Item',
      [['item_code', 'in', itemCodes]],
      ['item_code', 'item_name', 'item_name_ar'],
      0,
      500,
    );
    if (items) {
      items.forEach((item) => {
        itemNameMap.set(item.item_code, {
          nameEn: item.item_name,
          nameAr: item.item_name_ar ?? item.item_name,
        });
      });
    }
  }

  return balances
    .filter((b) => b.actual_qty > 0)
    .map((balance) => {
      const names = itemNameMap.get(balance.item_code) ?? { nameEn: balance.item_code, nameAr: balance.item_code };
      return erpStockBalanceToGgh(balance, names.nameEn, names.nameAr);
    });
}

/**
 * Get top selling items from ERPNext.
 * @param limit - Number of items to return
 * @param fromDate - Optional start date filter
 * @returns Array of top selling items or empty array if ERP is disabled
 */
export async function getTopSellingItems(
  limit: number = 10,
  fromDate?: string,
): Promise<GghTopSellingItem[]> {
  const filters: unknown[][] = [['docstatus', '=', 1]];
  if (fromDate) filters.push(['transaction_date', '>=', fromDate]);

  // Get sales order items to compute top sellers
  const soItems = await erpGetList<{
    item_code: string;
    item_name: string;
    qty: number;
    amount: number;
  }>(
    'Sales Order Item',
    filters.length > 0 ? filters : undefined,
    ['item_code', 'item_name', 'qty', 'amount'],
    0,
    500,
  );

  if (!soItems) return [];

  // Aggregate by item code
  const itemMap = new Map<string, { itemCode: string; itemName: string; qtySold: number; totalRevenue: number }>();
  for (const item of soItems) {
    const existing = itemMap.get(item.item_code);
    if (existing) {
      existing.qtySold += item.qty;
      existing.totalRevenue += item.amount;
    } else {
      itemMap.set(item.item_code, {
        itemCode: item.item_code,
        itemName: item.item_name,
        qtySold: item.qty,
        totalRevenue: item.amount,
      });
    }
  }

  // Sort by revenue descending and take top N
  const sorted = [...itemMap.values()]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  return sorted.map((item) => erpTopSellingItemToGgh(
    { item_code: item.itemCode, item_name: item.itemName, qty_sold: item.qtySold, total_revenue: item.totalRevenue },
    item.itemName,
  ));
}

/**
 * Get profit report data from ERPNext.
 * Compares revenue vs. cost for a given date range.
 * @param fromDate - Start date (YYYY-MM-DD)
 * @param toDate - End date (YYYY-MM-DD)
 * @returns GGH profit report or null if ERP is disabled
 */
export async function getProfitReport(fromDate: string, toDate: string): Promise<GghProfitReport | null> {
  // Get revenue from submitted Sales Orders
  const salesOrders = await erpGetList<{
    grand_total: number;
    total: number;
  }>(
    'Sales Order',
    [
      ['transaction_date', '>=', fromDate],
      ['transaction_date', '<=', toDate],
      ['docstatus', '=', 1],
    ],
    ['grand_total', 'total'],
    0,
    1000,
  );

  if (!salesOrders) return null;

  const totalRevenue = salesOrders.reduce((sum, o) => sum + o.grand_total, 0);

  // Estimate cost from valuation rate
  // This is a simplified approach — a real implementation would query GL entries
  const soItems = await erpGetList<{
    item_code: string;
    qty: number;
    rate: number;
    amount: number;
  }>(
    'Sales Order Item',
    [
      ['transaction_date', '>=', fromDate],
      ['transaction_date', '<=', toDate],
      ['docstatus', '=', 1],
    ],
    ['item_code', 'qty', 'rate', 'amount'],
    0,
    1000,
  );

  // Estimate cost: get valuation rates for sold items
  let totalCost = 0;
  if (soItems) {
    const itemCodes = [...new Set(soItems.map((i) => i.item_code))];
    const valuationRates = new Map<string, number>();

    for (const itemCode of itemCodes) {
      const bins = await erpGetList<{ valuation_rate: number }>(
        'Bin',
        [['item_code', '=', itemCode]],
        ['valuation_rate'],
        0,
        1,
      );
      if (bins && bins.length > 0) {
        valuationRates.set(itemCode, bins[0].valuation_rate);
      }
    }

    totalCost = soItems.reduce((sum, item) => {
      const costRate = valuationRates.get(item.item_code) ?? item.rate * 0.7; // Fallback: 70% of selling price
      return sum + costRate * item.qty;
    }, 0);
  }

  const grossProfit = totalRevenue - totalCost;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return erpProfitReportToGgh({
    total_revenue: totalRevenue,
    total_cost: totalCost,
    gross_profit: grossProfit,
    gross_margin: grossMargin,
    currency: 'EGP',
    from_date: fromDate,
    to_date: toDate,
  });
}

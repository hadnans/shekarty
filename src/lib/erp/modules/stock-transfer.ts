// GGH — ERPNext Stock Transfer Module
// Inter-warehouse stock transfers using Stock Entry

import { erpCreateDoc, erpGetList } from '../client';
import type { ErpStockEntry } from '../types';

/** Stock transfer item definition */
export interface StockTransferItem {
  itemCode: string;
  qty: number;
  rate?: number;
}

/** Transfer history record */
export interface TransferHistoryRecord {
  name: string;
  fromWarehouse: string;
  toWarehouse: string;
  postingDate: string;
  totalQty: number;
  totalValue: number;
  status: string;
}

/**
 * Create an inter-warehouse stock transfer in ERPNext.
 * Uses Stock Entry with purpose 'Material Transfer'.
 * @param fromWarehouse - Source warehouse name
 * @param toWarehouse - Destination warehouse name
 * @param items - Items to transfer with quantities
 * @param purpose - Stock entry purpose (default: 'Material Transfer')
 * @returns Created stock entry name or null if ERP is disabled
 */
export async function createStockTransfer(
  fromWarehouse: string,
  toWarehouse: string,
  items: StockTransferItem[],
  purpose: string = 'Material Transfer',
): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];

  const stockEntryItems = items.map((item, index) => ({
    item_code: item.itemCode,
    qty: item.qty,
    basic_rate: item.rate ?? 0,
    amount: (item.rate ?? 0) * item.qty,
    uom: 'Nos',
    s_warehouse: fromWarehouse,
    t_warehouse: toWarehouse,
    idx: index + 1,
  }));

  const doc = await erpCreateDoc<ErpStockEntry>('Stock Entry', {
    stock_entry_type: purpose,
    purpose,
    posting_date: today,
    company: config.company,
    items: stockEntryItems,
  });

  return doc?.name ?? null;
}

/**
 * Get stock transfer history from ERPNext.
 * @param filters - Filter conditions
 * @returns Array of transfer history records or empty array if ERP is disabled
 */
export async function getTransferHistory(filters: {
  fromWarehouse?: string;
  toWarehouse?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<TransferHistoryRecord[]> {
  const erpFilters: unknown[][] = [
    ['purpose', '=', 'Material Transfer'],
  ];

  if (filters.fromDate) erpFilters.push(['posting_date', '>=', filters.fromDate]);
  if (filters.toDate) erpFilters.push(['posting_date', '<=', filters.toDate]);

  const entries = await erpGetList<ErpStockEntry>(
    'Stock Entry',
    erpFilters,
    ['name', 'posting_date', 'total_outgoing_value', 'total_incoming_value', 'docstatus'],
    0,
    filters.limit ?? 50,
  );

  if (!entries) return [];

  return entries.map((entry) => ({
    name: entry.name,
    fromWarehouse: '', // Would need to query items for details
    toWarehouse: '',
    postingDate: entry.posting_date,
    totalQty: 0,
    totalValue: entry.total_incoming_value ?? 0,
    status: entry.docstatus === 1 ? 'Submitted' : entry.docstatus === 2 ? 'Cancelled' : 'Draft',
  }));
}

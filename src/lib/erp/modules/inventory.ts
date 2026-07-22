// GGH — ERPNext Inventory Module
// Stock Entry, Stock Ledger, reorder logic

import { erpGetList } from '../client';
import type {
  ErpStockBalance,
  ErpStockLedgerEntry,
  ErpStockEntry,
  ErpItemReorder,
  GghStockLevel,
} from '../types';
import { erpStockBalanceToGgh } from '../mappers';

/**
 * Get current stock levels from ERPNext.
 * Optionally filter by item code and/or warehouse.
 * @param itemCode - Optional item code filter
 * @param warehouse - Optional warehouse filter
 * @returns Array of GGH stock levels or empty array if ERP is disabled
 */
export async function getStockLevels(
  itemCode?: string,
  warehouse?: string,
): Promise<GghStockLevel[]> {
  const filters: unknown[][] = [];
  if (itemCode) filters.push(['item_code', '=', itemCode]);
  if (warehouse) filters.push(['warehouse', '=', warehouse]);

  const balances = await erpGetList<ErpStockBalance>(
    'Bin',
    filters.length > 0 ? filters : undefined,
    ['item_code', 'warehouse', 'actual_qty', 'ordered_qty', 'reserved_qty', 'projected_qty', 'valuation_rate', 'stock_value', 're_order_level'],
    0,
    100,
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
      200,
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
    .filter((b) => b.actual_qty > 0 || b.projected_qty !== 0)
    .map((balance) => {
      const names = itemNameMap.get(balance.item_code) ?? { nameEn: balance.item_code, nameAr: balance.item_code };
      return erpStockBalanceToGgh(balance, names.nameEn, names.nameAr);
    });
}

/**
 * Get stock ledger entries (movement history) from ERPNext.
 * @param filters - Filter conditions: itemCode, warehouse, fromDate, toDate
 * @returns Array of stock ledger entries or empty array if ERP is disabled
 */
export async function getStockLedgerEntries(filters: {
  itemCode?: string;
  warehouse?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ErpStockLedgerEntry[]> {
  const erpFilters: unknown[][] = [];
  if (filters.itemCode) erpFilters.push(['item_code', '=', filters.itemCode]);
  if (filters.warehouse) erpFilters.push(['warehouse', '=', filters.warehouse]);
  if (filters.fromDate) erpFilters.push(['posting_date', '>=', filters.fromDate]);
  if (filters.toDate) erpFilters.push(['posting_date', '<=', filters.toDate]);

  const entries = await erpGetList<ErpStockLedgerEntry>(
    'Stock Ledger Entry',
    erpFilters.length > 0 ? erpFilters : undefined,
    ['item_code', 'warehouse', 'posting_date', 'posting_time', 'actual_qty', 'qty_after_transaction', 'valuation_rate', 'stock_value', 'voucher_type', 'voucher_no'],
    0,
    50,
  );

  return entries ?? [];
}

/**
 * Create a Stock Entry in ERPNext for receipt, issue, or transfer.
 * @param entryType - Type of stock entry: 'Material Receipt', 'Material Issue', 'Material Transfer', 'Manufacture'
 * @param items - Items to include in the stock entry
 * @param warehouse - Default warehouse (for receipt/issue)
 * @returns Created stock entry name or null if ERP is disabled
 */
export async function createStockEntry(
  entryType: 'Material Receipt' | 'Material Issue' | 'Material Transfer' | 'Manufacture',
  items: Array<{
    itemCode: string;
    qty: number;
    rate?: number;
    sourceWarehouse?: string;
    targetWarehouse?: string;
  }>,
  warehouse?: string,
): Promise<string | null> {
  const { erpCreateDoc } = await import('../client');
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];

  const stockEntryItems = items.map((item, index) => {
    const entry: Record<string, unknown> = {
      item_code: item.itemCode,
      qty: item.qty,
      basic_rate: item.rate ?? 0,
      amount: (item.rate ?? 0) * item.qty,
      uom: 'Nos',
      idx: index + 1,
    };

    if (entryType === 'Material Receipt' || entryType === 'Manufacture') {
      entry.t_warehouse = item.targetWarehouse ?? warehouse ?? `${config.company} Warehouse`;
    } else if (entryType === 'Material Issue') {
      entry.s_warehouse = item.sourceWarehouse ?? warehouse ?? `${config.company} Warehouse`;
    } else if (entryType === 'Material Transfer') {
      entry.s_warehouse = item.sourceWarehouse ?? warehouse;
      entry.t_warehouse = item.targetWarehouse;
    }

    return entry;
  });

  const doc = await erpCreateDoc<ErpStockEntry>('Stock Entry', {
    stock_entry_type: entryType,
    posting_date: today,
    company: config.company,
    items: stockEntryItems,
  });

  return doc?.name ?? null;
}

/**
 * Get items that are below their reorder level in ERPNext.
 * @returns Array of items below reorder level or empty array if ERP is disabled
 */
export async function getReorderLevels(): Promise<Array<{
  itemCode: string;
  itemName: string;
  warehouse: string;
  reorderLevel: number;
  actualQty: number;
  projectedQty: number;
}>> {
  // Query items with reorder levels
  const reorders = await erpGetList<ErpItemReorder>(
    'Item Reorder',
    undefined,
    ['parent', 'warehouse', 'item_reorder_level', 'warehouse_level'],
    0,
    100,
  );

  if (!reorders || reorders.length === 0) return [];

  // Get current stock for those items
  const results: Array<{
    itemCode: string;
    itemName: string;
    warehouse: string;
    reorderLevel: number;
    actualQty: number;
    projectedQty: number;
  }> = [];

  for (const reorder of reorders) {
    const balances = await erpGetList<ErpStockBalance>(
      'Bin',
      [
        ['item_code', '=', reorder.parent],
        ['warehouse', '=', reorder.warehouse],
      ],
      ['item_code', 'warehouse', 'actual_qty', 'projected_qty'],
      0,
      1,
    );

    if (balances && balances.length > 0) {
      const balance = balances[0];
      if (balance.actual_qty <= reorder.item_reorder_level) {
        results.push({
          itemCode: reorder.parent,
          itemName: reorder.parent,
          warehouse: reorder.warehouse,
          reorderLevel: reorder.item_reorder_level,
          actualQty: balance.actual_qty,
          projectedQty: balance.projected_qty ?? 0,
        });
      }
    }
  }

  return results;
}

/**
 * Update the reorder level for an item in a specific warehouse.
 * @param itemCode - Item code to update
 * @param reorderLevel - New reorder level quantity
 * @param warehouse - Warehouse for the reorder level
 * @returns true if updated, null if ERP is disabled
 */
export async function updateReorderLevel(
  itemCode: string,
  reorderLevel: number,
  warehouse: string,
): Promise<boolean | null> {
  const { erpUpdateDoc } = await import('../client');

  // First check if item already has reorder levels
  const existingReorders = await erpGetList<ErpItemReorder>(
    'Item Reorder',
    [['parent', '=', itemCode], ['warehouse', '=', warehouse]],
    ['name', 'parent', 'warehouse', 'item_reorder_level'],
    0,
    10,
  );

  if (existingReorders && existingReorders.length > 0) {
    // Update existing reorder level via the parent Item doc
    await erpUpdateDoc('Item', itemCode, {
      reorder_levels: existingReorders.map((r) => ({
        ...r,
        item_reorder_level: reorderLevel,
      })),
    });
    return true;
  }

  // Add new reorder level to the Item
  await erpUpdateDoc('Item', itemCode, {
    reorder_levels: [{
      warehouse,
      material_request_type: 'Purchase',
      warehouse_level: reorderLevel,
      item_reorder_level: reorderLevel,
    }],
  });
  return true;
}

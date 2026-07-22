// GGH — ERPNext Purchase Order Module
// Supplier purchase orders and receipt

import { erpCreateDoc, erpGetList, erpGetDoc } from '../client';
import type { ErpPurchaseOrder } from '../types';

/** Purchase order item definition */
export interface PurchaseOrderItemDef {
  itemCode: string;
  qty: number;
  rate: number;
  warehouse?: string;
  scheduleDate?: string;
}

/**
 * Create a Purchase Order in ERPNext for a supplier.
 * @param supplier - ERPNext Supplier name or ID
 * @param items - Items to order with quantities and rates (in EGP)
 * @returns Created purchase order name or null if ERP is disabled
 */
export async function createPurchaseOrder(
  supplier: string,
  items: PurchaseOrderItemDef[],
): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];

  const poItems = items.map((item, index) => ({
    item_code: item.itemCode,
    qty: item.qty,
    rate: item.rate,
    amount: item.rate * item.qty,
    uom: 'Nos',
    schedule_date: item.scheduleDate ?? today,
    warehouse: item.warehouse ?? `${config.company} Warehouse`,
    idx: index + 1,
  }));

  const total = items.reduce((sum, item) => sum + item.rate * item.qty, 0);

  const doc = await erpCreateDoc<ErpPurchaseOrder>('Purchase Order', {
    supplier,
    transaction_date: today,
    company: config.company,
    currency: 'EGP',
    total_qty: items.reduce((sum, item) => sum + item.qty, 0),
    total,
    grand_total: total,
    items: poItems,
  });

  return doc?.name ?? null;
}

/**
 * Get purchase orders from ERPNext with optional filters.
 * @param filters - Filter conditions
 * @returns Array of purchase orders or empty array if ERP is disabled
 */
export async function getPurchaseOrders(filters: {
  supplier?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<ErpPurchaseOrder[]> {
  const erpFilters: unknown[][] = [];

  if (filters.supplier) erpFilters.push(['supplier', '=', filters.supplier]);
  if (filters.status) erpFilters.push(['status', '=', filters.status]);
  if (filters.fromDate) erpFilters.push(['transaction_date', '>=', filters.fromDate]);
  if (filters.toDate) erpFilters.push(['transaction_date', '<=', filters.toDate]);

  const orders = await erpGetList<ErpPurchaseOrder>(
    'Purchase Order',
    erpFilters.length > 0 ? erpFilters : undefined,
    ['name', 'supplier', 'supplier_name', 'transaction_date', 'total_qty', 'total', 'grand_total', 'status'],
    0,
    filters.limit ?? 20,
  );

  return orders ?? [];
}

/**
 * Receive a purchase order by creating a Stock Entry against it.
 * @param poName - Purchase Order name in ERPNext
 * @param items - Items being received with received quantities
 * @returns Created stock entry name or null if ERP is disabled
 */
export async function receivePurchaseOrder(
  poName: string,
  items: Array<{
    itemCode: string;
    qty: number;
    warehouse: string;
    purchaseOrderItemName?: string;
  }>,
): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];

  // Get the PO to find rates
  const po = await erpGetDoc<ErpPurchaseOrder>('Purchase Order', poName);
  if (!po) return null;

  const poItemMap = new Map(po.items.map((item) => [item.item_code, item]));

  const stockEntryItems = items.map((item, index) => {
    const poItem = poItemMap.get(item.itemCode);
    return {
      item_code: item.itemCode,
      qty: item.qty,
      basic_rate: poItem?.rate ?? 0,
      amount: (poItem?.rate ?? 0) * item.qty,
      uom: 'Nos',
      t_warehouse: item.warehouse,
      purchase_order: poName,
      purchase_order_item: item.purchaseOrderItemName ?? poItem?.name,
      idx: index + 1,
    };
  });

  const { erpCreateDoc: createDoc } = await import('../client');
  const doc = await createDoc('Stock Entry', {
    stock_entry_type: 'Material Receipt',
    purpose: 'Material Receipt',
    posting_date: today,
    company: config.company,
    items: stockEntryItems,
  });

  return doc?.name ?? null;
}

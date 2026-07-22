// GGH — ERPNext Delivery Note Module
// Delivery Notes created from Sales Orders

import { erpCreateDoc, erpGetList } from '../client';
import type { ErpDeliveryNote } from '../types';

/**
 * Create a Delivery Note in ERPNext from a Sales Order.
 * Copies all items from the Sales Order into the Delivery Note.
 * @param salesOrderName - ERPNext Sales Order name
 * @returns Created delivery note name or null if ERP is disabled
 */
export async function createDeliveryNote(salesOrderName: string): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const { erpGetDoc } = await import('../client');

  // Fetch the sales order to get items and customer
  const so = await erpGetDoc<{
    name: string;
    customer: string;
    customer_name?: string;
    items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      uom: string;
      rate: number;
      amount: number;
      warehouse?: string;
      name: string;
    }>;
    ggh_order_id?: string;
  }>('Sales Order', salesOrderName);

  if (!so) return null;

  const today = new Date().toISOString().split('T')[0];

  const dnItems = so.items.map((item, index) => ({
    item_code: item.item_code,
    item_name: item.item_name,
    qty: item.qty,
    uom: item.uom || 'Nos',
    rate: item.rate,
    amount: item.amount,
    warehouse: item.warehouse,
    against_sales_order: salesOrderName,
    against_sales_order_item: item.name,
    idx: index + 1,
  }));

  const doc = await erpCreateDoc<ErpDeliveryNote>('Delivery Note', {
    customer: so.customer,
    customer_name: so.customer_name,
    posting_date: today,
    company: config.company,
    items: dnItems,
    ggh_order_id: so.ggh_order_id,
  });

  return doc?.name ?? null;
}

/**
 * Get Delivery Notes from ERPNext with optional filters.
 * @param filters - Filter conditions
 * @returns Array of delivery notes or empty array if ERP is disabled
 */
export async function getDeliveryNotes(filters: {
  customer?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  gghOrderId?: string;
  limit?: number;
}): Promise<ErpDeliveryNote[]> {
  const erpFilters: unknown[][] = [];

  if (filters.customer) erpFilters.push(['customer', '=', filters.customer]);
  if (filters.status) erpFilters.push(['status', '=', filters.status]);
  if (filters.fromDate) erpFilters.push(['posting_date', '>=', filters.fromDate]);
  if (filters.toDate) erpFilters.push(['posting_date', '<=', filters.toDate]);
  if (filters.gghOrderId) erpFilters.push(['ggh_order_id', '=', filters.gghOrderId]);

  const notes = await erpGetList<ErpDeliveryNote>(
    'Delivery Note',
    erpFilters.length > 0 ? erpFilters : undefined,
    ['name', 'customer', 'customer_name', 'posting_date', 'total_qty', 'total', 'grand_total', 'status', 'ggh_order_id'],
    0,
    filters.limit ?? 20,
  );

  return notes ?? [];
}

// GGH — ERPNext Sales Order Module
// Customer-facing Sales Orders created from GGH orders

import { erpCreateDoc, erpGetList, erpUpdateDoc } from '../client';
import type { ErpSalesOrder } from '../types';
import { gghOrderToErpSalesOrder } from '../mappers';
import type { Order } from '@/types/ggh';

/**
 * Create a Sales Order in ERPNext from a GGH order.
 * Maps GGH order data to ERPNext Sales Order format.
 * @param gghOrder - GGH Order domain object with items
 * @returns Created sales order name or null if ERP is disabled
 */
export async function createSalesOrder(gghOrder: Order): Promise<string | null> {
  const soData = gghOrderToErpSalesOrder(gghOrder);
  const doc = await erpCreateDoc<ErpSalesOrder>('Sales Order', soData);
  return doc?.name ?? null;
}

/**
 * Get Sales Orders from ERPNext with optional filters.
 * @param filters - Filter conditions
 * @returns Array of sales orders or empty array if ERP is disabled
 */
export async function getSalesOrders(filters: {
  customer?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  gghOrderId?: string;
  limit?: number;
}): Promise<ErpSalesOrder[]> {
  const erpFilters: unknown[][] = [];

  if (filters.customer) erpFilters.push(['customer', '=', filters.customer]);
  if (filters.status) erpFilters.push(['status', '=', filters.status]);
  if (filters.fromDate) erpFilters.push(['transaction_date', '>=', filters.fromDate]);
  if (filters.toDate) erpFilters.push(['transaction_date', '<=', filters.toDate]);
  if (filters.gghOrderId) erpFilters.push(['ggh_order_id', '=', filters.gghOrderId]);

  const orders = await erpGetList<ErpSalesOrder>(
    'Sales Order',
    erpFilters.length > 0 ? erpFilters : undefined,
    ['name', 'customer', 'customer_name', 'transaction_date', 'delivery_date', 'total_qty', 'total', 'grand_total', 'status', 'ggh_order_id', 'ggh_order_number'],
    0,
    filters.limit ?? 20,
  );

  return orders ?? [];
}

/**
 * Update the status of a Sales Order in ERPNext.
 * Can submit (transition from Draft to Open) or cancel.
 * @param name - Sales Order name
 * @param status - Action to perform: 'submit', 'cancel', or 'update'
 * @param updateData - Optional fields to update (for 'update' action)
 * @returns Updated document or null if ERP is disabled
 */
export async function updateSalesOrderStatus(
  name: string,
  status: 'submit' | 'cancel' | 'update',
  updateData?: Record<string, unknown>,
): Promise<ErpSalesOrder | null> {
  if (status === 'submit') {
    // Submit the document (docstatus 0 → 1)
    const { erpCallMethod } = await import('../client');
    const result = await erpCallMethod<ErpSalesOrder>('frappe.client.submit', {
      doc: { doctype: 'Sales Order', name },
    });
    return result;
  }

  if (status === 'cancel') {
    // Cancel the document (docstatus 1 → 2)
    const { erpCallMethod } = await import('../client');
    const result = await erpCallMethod<ErpSalesOrder>('frappe.client.cancel', {
      doctype: 'Sales Order',
      name,
    });
    return result;
  }

  // Simple update
  if (updateData) {
    return erpUpdateDoc<ErpSalesOrder>('Sales Order', name, updateData);
  }

  return null;
}

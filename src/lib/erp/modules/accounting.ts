// GGH — ERPNext Accounting Module
// Payment Entry, Journal Entry, Sales Invoice

import { erpCreateDoc, erpGetList } from '../client';
import type { ErpPaymentEntry, ErpSalesInvoice } from '../types';
import { piastresToEgpFloat } from '../types';
import type { Piastres } from '@/types/ggh';

/**
 * Create a Payment Entry in ERPNext to record a payment against a Sales Order.
 * @param salesOrderName - ERPNext Sales Order name
 * @param amount - Payment amount in piastres
 * @param paymentMethod - Payment method (cod, card, wallet)
 * @returns Created payment entry name or null if ERP is disabled
 */
export async function createPaymentEntry(
  salesOrderName: string,
  amount: Piastres,
  paymentMethod: string,
): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];

  // Map GGH payment method to ERPNext mode of payment
  const modeOfPayment = paymentMethod === 'card'
    ? 'Credit Card'
    : paymentMethod === 'wallet'
      ? 'Mobile Payment'
      : 'Cash';

  // Get the sales order to find customer and accounts
  const { erpGetDoc } = await import('../client');
  const so = await erpGetDoc<{
    customer: string;
    grand_total: number;
    currency: string;
  }>('Sales Order', salesOrderName);

  if (!so) return null;

  const doc = await erpCreateDoc<ErpPaymentEntry>('Payment Entry', {
    payment_type: 'Receive',
    posting_date: today,
    party_type: 'Customer',
    party: so.customer,
    paid_amount: piastresToEgpFloat(amount),
    received_amount: piastresToEgpFloat(amount),
    source_exchange_rate: 1,
    mode_of_payment: modeOfPayment,
    company: config.company,
    references: [{
      reference_doctype: 'Sales Order',
      reference_name: salesOrderName,
      total_amount: so.grand_total,
      outstanding_amount: so.grand_total,
      allocated_amount: piastresToEgpFloat(amount),
    }],
    ggh_order_id: salesOrderName,
  });

  return doc?.name ?? null;
}

/**
 * Create a Sales Invoice from a Sales Order in ERPNext.
 * @param salesOrderName - ERPNext Sales Order name
 * @returns Created sales invoice name or null if ERP is disabled
 */
export async function createSalesInvoice(salesOrderName: string): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];

  // Get the sales order to create invoice from
  const { erpGetDoc } = await import('../client');
  const so = await erpGetDoc<{
    customer: string;
    customer_name?: string;
    items: Array<{
      item_code: string;
      item_name: string;
      qty: number;
      uom: string;
      rate: number;
      amount: number;
      name: string;
    }>;
    total: number;
    grand_total: number;
    currency: string;
    ggh_order_id?: string;
  }>('Sales Order', salesOrderName);

  if (!so) return null;

  const invoiceItems = so.items.map((item, index) => ({
    item_code: item.item_code,
    item_name: item.item_name,
    qty: item.qty,
    uom: item.uom || 'Nos',
    rate: item.rate,
    amount: item.amount,
    sales_order: salesOrderName,
    sales_order_item: item.name,
    idx: index + 1,
  }));

  const doc = await erpCreateDoc<ErpSalesInvoice>('Sales Invoice', {
    customer: so.customer,
    customer_name: so.customer_name,
    posting_date: today,
    due_date: today,
    company: config.company,
    currency: so.currency || 'EGP',
    total: so.total,
    grand_total: so.grand_total,
    items: invoiceItems,
    ggh_order_id: so.ggh_order_id,
  });

  return doc?.name ?? null;
}

/**
 * Get outstanding (unpaid) invoices from ERPNext.
 * @param customer - Optional customer name filter
 * @returns Array of outstanding invoices or empty array if ERP is disabled
 */
export async function getOutstandingInvoices(customer?: string): Promise<Array<{
  name: string;
  customer: string;
  customerName?: string;
  postingDate: string;
  dueDate: string;
  grandTotal: number;
  outstandingAmount: number;
  currency: string;
  status: string;
}>> {
  const erpFilters: unknown[][] = [
    ['outstanding_amount', '>', 0],
    ['docstatus', '=', 1],
  ];

  if (customer) erpFilters.push(['customer', '=', customer]);

  const invoices = await erpGetList<ErpSalesInvoice>(
    'Sales Invoice',
    erpFilters,
    ['name', 'customer', 'customer_name', 'posting_date', 'due_date', 'grand_total', 'outstanding_amount', 'currency', 'status'],
    0,
    50,
  );

  if (!invoices) return [];

  return invoices.map((inv) => ({
    name: inv.name,
    customer: inv.customer,
    customerName: inv.customer_name,
    postingDate: inv.posting_date,
    dueDate: inv.due_date,
    grandTotal: inv.grand_total,
    outstandingAmount: inv.outstanding_amount,
    currency: inv.currency ?? 'EGP',
    status: inv.status,
  }));
}

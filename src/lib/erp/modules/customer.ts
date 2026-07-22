// GGH — ERPNext Customer Module
// Customer sync (GGH Customer → ERPNext Customer)

import { erpGetDoc, erpCreateDoc, erpUpdateDoc, erpGetList } from '../client';
import type { ErpCustomer } from '../types';
import { gghCustomerToErpCustomer } from '../mappers';
import type { CustomerProfile } from '@/types/ggh';

/**
 * Sync a GGH customer to ERPNext.
 * Creates the customer if it doesn't exist, updates if it does.
 * Links via the ggh_customer_id custom field.
 * @param gghCustomer - GGH CustomerProfile to sync
 * @returns ERPNext Customer name or null if ERP is disabled
 */
export async function syncCustomer(gghCustomer: CustomerProfile): Promise<string | null> {
  // Check if customer already exists in ERPNext by GGH ID
  const existing = await erpGetList<ErpCustomer>(
    'Customer',
    [['ggh_customer_id', '=', gghCustomer.id]],
    ['name', 'customer_name'],
    0,
    1,
  );

  const customerData = gghCustomerToErpCustomer(gghCustomer);

  if (existing && existing.length > 0) {
    // Update existing customer
    const erpName = existing[0].name;
    await erpUpdateDoc<ErpCustomer>('Customer', erpName, customerData);
    return erpName;
  }

  // Create new customer
  const doc = await erpCreateDoc<ErpCustomer>('Customer', customerData);
  return doc?.name ?? null;
}

/**
 * Get an ERPNext Customer by name/ID.
 * @param name - ERPNext Customer name
 * @returns ERPNext Customer document or null if not found / ERP disabled
 */
export async function getCustomer(name: string): Promise<ErpCustomer | null> {
  return erpGetDoc<ErpCustomer>('Customer', name);
}

/**
 * Find an ERPNext Customer by GGH Customer ID.
 * @param gghCustomerId - GGH customer ID
 * @returns ERPNext Customer document or null if not found / ERP disabled
 */
export async function getCustomerByGghId(gghCustomerId: string): Promise<ErpCustomer | null> {
  const results = await erpGetList<ErpCustomer>(
    'Customer',
    [['ggh_customer_id', '=', gghCustomerId]],
    ['name', 'customer_name', 'customer_name_ar', 'phone', 'mobile_no', 'email_id', 'ggh_customer_id', 'ggh_wholesale_status'],
    0,
    1,
  );

  return results?.[0] ?? null;
}

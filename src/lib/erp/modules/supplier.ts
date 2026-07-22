// GGH — ERPNext Supplier Module
// Supplier CRUD and pricing

import { erpGetList, erpCreateDoc } from '../client';
import type { ErpSupplier } from '../types';

/**
 * List all suppliers from ERPNext.
 * @param filters - Optional filter conditions
 * @returns Array of suppliers or empty array if ERP is disabled
 */
export async function listSuppliers(filters?: {
  supplierGroup?: string;
  search?: string;
  limit?: number;
}): Promise<ErpSupplier[]> {
  const erpFilters: unknown[][] = [];

  if (filters?.supplierGroup) erpFilters.push(['supplier_group', '=', filters.supplierGroup]);
  if (filters?.search) {
    erpFilters.push(['supplier_name', 'like', `%${filters.search}%`]);
  }

  const suppliers = await erpGetList<ErpSupplier>(
    'Supplier',
    erpFilters.length > 0 ? erpFilters : undefined,
    ['name', 'supplier_name', 'supplier_name_ar', 'supplier_type', 'supplier_group', 'phone', 'email_id', 'default_currency', 'ggh_supplier_id'],
    0,
    filters?.limit ?? 50,
  );

  return suppliers ?? [];
}

/**
 * Create a new supplier in ERPNext.
 * @param data - Supplier creation data
 * @returns Created supplier name or null if ERP is disabled
 */
export async function createSupplier(data: {
  nameEn: string;
  nameAr?: string;
  supplierType?: string;
  supplierGroup?: string;
  phone?: string;
  email?: string;
  gghSupplierId?: string;
}): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();

  const supplier = await erpCreateDoc<ErpSupplier>('Supplier', {
    supplier_name: data.nameEn,
    supplier_name_ar: data.nameAr,
    supplier_type: data.supplierType ?? 'Company',
    supplier_group: data.supplierGroup ?? 'All Supplier Groups',
    country: 'Egypt',
    phone: data.phone,
    email_id: data.email,
    default_currency: 'EGP',
    ggh_supplier_id: data.gghSupplierId,
    company: config.company,
  });

  return supplier?.name ?? null;
}

/**
 * Get supplier pricing for specific items.
 * Queries Item Price records for the supplier's price list.
 * @param supplier - Supplier name in ERPNext
 * @param itemCodes - Array of item codes to get prices for
 * @returns Array of item prices or empty array if ERP is disabled
 */
export async function getSupplierPricing(
  supplier: string,
  itemCodes: string[],
): Promise<Array<{
  itemCode: string;
  priceListRate: number;
  currency: string;
  validFrom: string | null;
  validUpto: string | null;
}>> {
  // Get supplier's default price list
  const supplierDoc = await erpGetList<{ default_price_list?: string }>(
    'Supplier',
    [['name', '=', supplier]],
    ['default_price_list'],
    0,
    1,
  );

  const priceList = supplierDoc?.[0]?.default_price_list ?? 'Standard Buying';

  // Get prices from Item Price
  const prices = await erpGetList<{
    item_code: string;
    price_list_rate: number;
    currency: string;
    valid_from?: string;
    valid_upto?: string;
  }>(
    'Item Price',
    [
      ['price_list', '=', priceList],
      ['item_code', 'in', itemCodes],
    ],
    ['item_code', 'price_list_rate', 'currency', 'valid_from', 'valid_upto'],
    0,
    itemCodes.length,
  );

  if (!prices) return [];

  return prices.map((p) => ({
    itemCode: p.item_code,
    priceListRate: p.price_list_rate,
    currency: p.currency ?? 'EGP',
    validFrom: p.valid_from ?? null,
    validUpto: p.valid_upto ?? null,
  }));
}

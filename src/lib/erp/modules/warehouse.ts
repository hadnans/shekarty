// GGH — ERPNext Warehouse Module
// Warehouse CRUD and capacity management

import { erpGetDoc, erpGetList, erpCreateDoc } from '../client';
import type { ErpWarehouse, GghWarehouseInfo } from '../types';
import { erpWarehouseToGgh } from '../mappers';

/**
 * List all warehouses from ERPNext.
 * @returns Array of GGH warehouse info objects or empty array if ERP is disabled
 */
export async function listWarehouses(): Promise<GghWarehouseInfo[]> {
  const warehouses = await erpGetList<ErpWarehouse>(
    'Warehouse',
    [['is_group', '=', 0]],
    ['name', 'warehouse_name', 'warehouse_name_ar', 'warehouse_type', 'parent_warehouse', 'company', 'city', 'area', 'ggh_warehouse_id'],
    0,
    100,
  );

  if (!warehouses) return [];

  return warehouses.map(erpWarehouseToGgh);
}

/**
 * Get a single warehouse by name from ERPNext.
 * @param name - Warehouse name in ERPNext
 * @returns GGH warehouse info or null if not found / ERP disabled
 */
export async function getWarehouse(name: string): Promise<GghWarehouseInfo | null> {
  const warehouse = await erpGetDoc<ErpWarehouse>('Warehouse', name);
  if (!warehouse) return null;
  return erpWarehouseToGgh(warehouse);
}

/**
 * Create a new warehouse in ERPNext.
 * @param data - Warehouse creation data
 * @returns Created warehouse name or null if ERP is disabled
 */
export async function createWarehouse(data: {
  nameEn: string;
  nameAr: string;
  city?: string;
  area?: string;
  parentWarehouse?: string;
  gghWarehouseId?: string;
}): Promise<string | null> {
  const { getErpConfig } = await import('../config');
  const config = getErpConfig();

  const warehouse = await erpCreateDoc<ErpWarehouse>('Warehouse', {
    warehouse_name: data.nameEn,
    warehouse_name_ar: data.nameAr,
    warehouse_type: 'Transit',
    parent_warehouse: data.parentWarehouse ?? `All Warehouses - ${config.company}`,
    company: config.company,
    is_group: 0,
    city: data.city ?? 'Cairo',
    area: data.area ?? '',
    ggh_warehouse_id: data.gghWarehouseId,
  });

  return warehouse?.name ?? null;
}

/**
 * Get warehouse capacity information.
 * Returns current stock count and value for the warehouse.
 * @param name - Warehouse name in ERPNext
 * @returns Capacity info or null if not found / ERP disabled
 */
export async function getWarehouseCapacity(name: string): Promise<{
  warehouseName: string;
  totalItems: number;
  totalStockValue: number;
  totalQty: number;
} | null> {
  const bins = await erpGetList<{
    item_code: string;
    actual_qty: number;
    stock_value: number;
  }>(
    'Bin',
    [['warehouse', '=', name]],
    ['item_code', 'actual_qty', 'stock_value'],
    0,
    1000,
  );

  if (!bins) return null;

  const warehouse = await erpGetDoc<ErpWarehouse>('Warehouse', name);
  if (!warehouse) return null;

  const totalItems = new Set(bins.map((b) => b.item_code)).size;
  const totalStockValue = bins.reduce((sum, b) => sum + (b.stock_value ?? 0), 0);
  const totalQty = bins.reduce((sum, b) => sum + b.actual_qty, 0);

  return {
    warehouseName: warehouse.warehouse_name,
    totalItems,
    totalStockValue,
    totalQty,
  };
}

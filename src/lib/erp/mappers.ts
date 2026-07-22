// GGH — ERPNext Mappers
// Map between GGH domain types and ERPNext document types.
// All monetary conversions: GGH uses integer piastres, ERPNext uses EGP floats.

import type {
  Product,
  CustomerProfile,
  Order,
  OrderItem,
  Piastres,
} from '@/types/ggh';

import type {
  ErpSalesOrder,
  ErpSalesOrderItem,
  ErpStockBalance,
  GghStockLevel,
  GghWarehouseInfo,
  GghSalesSummary,
  GghTopSellingItem,
  GghProfitReport,
  ErpSalesSummary,
  ErpTopSellingItem,
  ErpProfitReport,
  ErpWarehouse,
} from './types';

import {
  egpFloatToPiastres,
  piastresToEgpFloat,
} from './types';

import { getErpConfig } from './config';

// ============================================
// PRODUCT → ERP ITEM
// ============================================

/**
 * Map a GGH Product to an ERPNext Item document.
 * Converts piastres to EGP floats, maps bilingual fields.
 * @param product - GGH Product domain object
 * @returns ERPNext Item document data (without base fields)
 */
export function gghProductToErpItem(product: Product): Record<string, unknown> {
  const config = getErpConfig();

  return {
    item_code: product.handle,
    item_name: product.nameEn,
    item_name_ar: product.nameAr,
    item_group: 'All Item Groups',
    brand: product.brandEn || undefined,
    brand_ar: product.brandAr || undefined,
    description: product.descriptionEn || undefined,
    description_ar: product.descriptionAr || undefined,
    standard_rate: product.todayPrice ? piastresToEgpFloat(product.todayPrice) : 0,
    wholesale_rate: product.wholesalePrice ? piastresToEgpFloat(product.wholesalePrice) : undefined,
    stock_uom: product.unit || 'Nos',
    barcode: product.barcode || undefined,
    is_stock_item: 1,
    is_sales_item: 1,
    is_purchase_item: 1,
    image: product.imageUrl || undefined,
    thumbnail: product.thumbnailUrl || undefined,
    ggh_icon: product.icon || undefined,
    disabled: product.isActive ? 0 : 1,
    company: config.company,
  };
}

// ============================================
// CUSTOMER → ERP CUSTOMER
// ============================================

/**
 * Map a GGH Customer profile to an ERPNext Customer document.
 * @param customer - GGH CustomerProfile domain object
 * @returns ERPNext Customer document data
 */
export function gghCustomerToErpCustomer(customer: CustomerProfile): Record<string, unknown> {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.phone;

  return {
    customer_name: fullName,
    customer_name_ar: customer.nameAr || undefined,
    customer_type: 'Individual',
    customer_group: 'All Customer Groups',
    territory: 'Egypt',
    default_currency: 'EGP',
    mobile_no: customer.phone,
    language: customer.preferredLang === 'ar' ? 'ar' : 'en',
    ggh_customer_id: customer.id,
    ggh_wholesale_status: customer.wholesaleStatus,
  };
}

// ============================================
// ORDER → ERP SALES ORDER
// ============================================

/**
 * Map GGH Order items to ERPNext Sales Order item rows.
 * Converts piastres to EGP floats for each line item.
 * @param items - Array of GGH OrderItem objects
 * @returns Array of ERPNext Sales Order item data
 */
export function gghOrderItemsToErpItems(items: OrderItem[]): Record<string, unknown>[] {
  const config = getErpConfig();

  return items.map((item, index) => ({
    item_code: item.productNameEn, // Should be the product handle ideally, but use name as fallback
    item_name: item.productNameEn,
    description: `${item.productNameEn} / ${item.productNameAr}`,
    qty: item.quantity,
    uom: 'Nos',
    rate: piastresToEgpFloat(item.unitPrice),
    amount: piastresToEgpFloat(item.totalPrice),
    delivery_date: new Date().toISOString().split('T')[0],
    ggh_product_id: item.productId,
    ggh_order_item_id: item.id,
    idx: index + 1,
    warehouse: config.company ? `${config.company} Warehouse` : undefined,
  }));
}

/**
 * Map a GGH Order to an ERPNext Sales Order document.
 * Creates the full SO structure with items, custom fields, and metadata.
 * @param order - GGH Order domain object (with items loaded)
 * @returns ERPNext Sales Order document data
 */
export function gghOrderToErpSalesOrder(order: Order): Record<string, unknown> {
  const config = getErpConfig();
  const today = new Date().toISOString().split('T')[0];
  const deliveryDate = order.deliveryDate
    ? new Date(order.deliveryDate).toISOString().split('T')[0]
    : today;

  return {
    customer: order.customerId, // Should match ERPNext Customer name or ID
    customer_name: order.customerId,
    order_type: 'Sales',
    transaction_date: today,
    delivery_date: deliveryDate,
    company: config.company,
    currency: 'EGP',
    total_qty: order.items.reduce((sum, item) => sum + item.quantity, 0),
    total: piastresToEgpFloat(order.subtotal),
    grand_total: piastresToEgpFloat(order.totalAmount),
    items: gghOrderItemsToErpItems(order.items),
    ggh_order_id: order.id,
    ggh_order_number: order.orderNumber,
    ggh_delivery_slot: order.deliverySlot || undefined,
    ggh_delivery_address: order.deliveryAddressSnapshot || undefined,
    ggh_payment_method: order.paymentMethod,
  };
}

// ============================================
// REVERSE MAPPINGS: ERP → GGH
// ============================================

/**
 * Map an ERPNext Sales Order back to a GGH-compatible summary.
 * Used for displaying ERP-synced order data in the GGH frontend.
 * @param erpSO - ERPNext Sales Order document
 * @returns GGH-compatible order summary
 */
export function erpSalesOrderToGgh(erpSO: ErpSalesOrder): {
  erpDocName: string;
  erpStatus: string;
  grandTotal: Piastres;
  totalQty: number;
  transactionDate: string;
  deliveryDate: string | null;
  items: Array<{
    itemCode: string;
    qty: number;
    rate: Piastres;
    amount: Piastres;
  }>;
} {
  return {
    erpDocName: erpSO.name,
    erpStatus: erpSO.status,
    grandTotal: egpFloatToPiastres(erpSO.grand_total),
    totalQty: erpSO.total_qty,
    transactionDate: erpSO.transaction_date,
    deliveryDate: erpSO.delivery_date ?? null,
    items: (erpSO.items ?? []).map((item: ErpSalesOrderItem) => ({
      itemCode: item.item_code,
      qty: item.qty,
      rate: egpFloatToPiastres(item.rate),
      amount: egpFloatToPiastres(item.amount),
    })),
  };
}

/**
 * Map ERPNext Stock Balance data to GGH stock level format.
 * Converts EGP floats to piastres.
 * @param balance - ERPNext stock balance record
 * @param itemNameEn - English item name for display
 * @param itemNameAr - Arabic item name for display
 * @returns GGH stock level object
 */
export function erpStockBalanceToGgh(
  balance: ErpStockBalance,
  itemNameEn: string,
  itemNameAr: string,
): GghStockLevel {
  return {
    itemCode: balance.item_code,
    itemNameEn,
    itemNameAr,
    warehouse: balance.warehouse,
    actualQty: balance.actual_qty,
    reservedQty: balance.reserved_qty ?? 0,
    projectedQty: balance.projected_qty ?? 0,
    valuationRate: egpFloatToPiastres(balance.valuation_rate ?? 0),
    stockValue: egpFloatToPiastres(balance.stock_value ?? 0),
    reorderLevel: balance.re_order_level ?? 0,
  };
}

/**
 * Map ERPNext Warehouse to GGH warehouse info format.
 * @param warehouse - ERPNext Warehouse document
 * @returns GGH warehouse info object
 */
export function erpWarehouseToGgh(warehouse: ErpWarehouse): GghWarehouseInfo {
  return {
    name: warehouse.name,
    nameEn: warehouse.warehouse_name,
    nameAr: warehouse.warehouse_name_ar ?? warehouse.warehouse_name,
    city: warehouse.city ?? 'Cairo',
    area: warehouse.area ?? '',
    isActive: true,
    capacity: 0,
    currentLoad: 0,
    gghId: warehouse.ggh_warehouse_id ?? null,
  };
}

// ============================================
// REPORT MAPPINGS
// ============================================

/**
 * Map ERPNext Sales Summary to GGH dashboard format.
 * @param summary - ERPNext sales summary
 * @returns GGH sales summary with piastres
 */
export function erpSalesSummaryToGgh(summary: ErpSalesSummary): GghSalesSummary {
  return {
    totalSales: egpFloatToPiastres(summary.total_sales),
    totalOrders: summary.total_orders,
    averageOrderValue: egpFloatToPiastres(summary.average_order_value),
    totalItemsSold: summary.total_items_sold,
    fromDate: summary.from_date,
    toDate: summary.to_date,
  };
}

/**
 * Map ERPNext top selling item to GGH format.
 * @param item - ERPNext top selling item
 * @param itemNameAr - Arabic item name
 * @returns GGH top selling item with piastres
 */
export function erpTopSellingItemToGgh(item: ErpTopSellingItem, itemNameAr: string): GghTopSellingItem {
  return {
    itemCode: item.item_code,
    itemName: { en: item.item_name, ar: itemNameAr || item.item_name },
    qtySold: item.qty_sold,
    totalRevenue: egpFloatToPiastres(item.total_revenue),
  };
}

/**
 * Map ERPNext profit report to GGH format.
 * @param report - ERPNext profit report
 * @returns GGH profit report with piastres
 */
export function erpProfitReportToGgh(report: ErpProfitReport): GghProfitReport {
  return {
    totalRevenue: egpFloatToPiastres(report.total_revenue),
    totalCost: egpFloatToPiastres(report.total_cost),
    grossProfit: egpFloatToPiastres(report.gross_profit),
    grossMargin: report.gross_margin,
    fromDate: report.from_date,
    toDate: report.to_date,
  };
}

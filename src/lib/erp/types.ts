// GGH — ERPNext Document Types
// Mapped from/to GGH domain types. All monetary values in Piastres (integer).

import type { Piastres, BilingualText, Lang } from '@/types/ggh';

// ============================================
// BASE ERP TYPES
// ============================================

/** Base fields present on all ERPNext documents */
export interface ErpDocBase {
  /** Document name (primary key in ERPNext, e.g., 'SO-00001') */
  name: string;
  /** Owner (user who created) */
  owner: string;
  /** Creation timestamp */
  creation: string;
  /** Last modification timestamp */
  modified: string;
  /** User who last modified */
  modified_by: string;
  /** Document status: 0=Draft, 1=Submitted, 2=Cancelled */
  docstatus: 0 | 1 | 2;
  /** Parent DocType (for table items) */
  parent?: string;
  /** Parent field name */
  parentfield?: string;
  /** Parent type */
  parenttype?: string;
  /** Document index in table */
  idx?: number;
}

// ============================================
// ITEM (PRODUCT)
// ============================================

/** ERPNext Item document representing a GGH Product */
export interface ErpItem extends ErpDocBase {
  /** Item code (maps to Product.handle) */
  item_code: string;
  /** Item name (EN) */
  item_name: string;
  /** Arabic name (custom field) */
  item_name_ar?: string;
  /** Item group */
  item_group: string;
  /** Brand */
  brand?: string;
  /** Brand Arabic name */
  brand_ar?: string;
  /** Description */
  description?: string;
  /** Arabic description */
  description_ar?: string;
  /** Standard selling rate in EGP (we convert to/from piastres) */
  standard_rate: number;
  /** Wholesale rate in EGP */
  wholesale_rate?: number;
  /** Valuation rate (cost) in EGP */
  valuation_rate?: number;
  /** Unit of measure */
  stock_uom: string;
  /** Barcode */
  barcode?: string;
  /** Weight */
  weight?: number;
  /** Weight UOM */
  weight_uom?: string;
  /** Has serial number */
  has_serial_no: 0 | 1;
  /** Has batch number */
  has_batch_no: 0 | 1;
  /** Is stock item */
  is_stock_item: 0 | 1;
  /** Image URL */
  image?: string;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Is sales item */
  is_sales_item: 0 | 1;
  /** Is purchase item */
  is_purchase_item: 0 | 1;
  /** Default warehouse */
  default_warehouse?: string;
  /** Reorder level */
  reorder_level?: number;
  /** Reorder qty */
  reorder_qty?: number;
  /** Icon (GGH custom field) */
  ggh_icon?: string;
  /** Is active */
  disabled: 0 | 1;
}

// ============================================
// CUSTOMER
// ============================================

/** ERPNext Customer document synced from GGH Customer */
export interface ErpCustomer extends ErpDocBase {
  /** Customer ID / name */
  customer_name: string;
  /** Arabic name */
  customer_name_ar?: string;
  /** Customer type (Individual / Company) */
  customer_type: 'Individual' | 'Company';
  /** Customer group */
  customer_group: string;
  /** Territory */
  territory: string;
  /** Default currency */
  default_currency?: string;
  /** Default price list */
  default_price_list?: string;
  /** Phone */
  phone?: string;
  /** Mobile */
  mobile_no?: string;
  /** Email */
  email_id?: string;
  /** Image */
  image?: string;
  /** GGH Customer ID (custom field for linking) */
  ggh_customer_id?: string;
  /** Wholesale status */
  ggh_wholesale_status?: string;
  /** Preferred language */
  language?: string;
  /** Is frozen */
  is_frozen?: 0 | 1;
}

// ============================================
// SALES ORDER
// ============================================

/** Sales Order item child table row */
export interface ErpSalesOrderItem extends ErpDocBase {
  /** Item code */
  item_code: string;
  /** Item name */
  item_name: string;
  /** Description */
  description?: string;
  /** Quantity */
  qty: number;
  /** UOM */
  uom: string;
  /** Rate in EGP */
  rate: number;
  /** Amount in EGP */
  amount: number;
  /** Warehouse */
  warehouse?: string;
  /** Delivery date */
  delivery_date: string;
  /** GGH product ID */
  ggh_product_id?: string;
  /** GGH order item ID */
  ggh_order_item_id?: string;
}

/** ERPNext Sales Order document created from GGH Order */
export interface ErpSalesOrder extends ErpDocBase {
  /** Sales Order name (e.g., 'SAL-ORD-2024-00001') */
  name: string;
  /** Customer */
  customer: string;
  /** Customer name */
  customer_name?: string;
  /** Order type */
  order_type?: string;
  /** Transaction date */
  transaction_date: string;
  /** Delivery date */
  delivery_date?: string;
  /** Company */
  company: string;
  /** Currency */
  currency: string;
  /** Total net weight */
  total_net_weight?: number;
  /** Total quantity */
  total_qty: number;
  /** Net total in EGP */
  total_net_weight?: number;
  /** Net total in EGP */
  total: number;
  /** Total taxes and charges in EGP */
  total_taxes_and_charges?: number;
  /** Grand total in EGP */
  grand_total: number;
  /** Rounded total in EGP */
  rounded_total?: number;
  /** Status */
  status: string;
  /** Payment terms template */
  payment_terms_template?: string;
  /** Items */
  items: ErpSalesOrderItem[];
  /** GGH Order ID */
  ggh_order_id?: string;
  /** GGH Order Number */
  ggh_order_number?: string;
  /** Delivery slot */
  ggh_delivery_slot?: string;
  /** Delivery address snapshot */
  ggh_delivery_address?: string;
  /** Payment method */
  ggh_payment_method?: string;
}

// ============================================
// PURCHASE ORDER
// ============================================

/** Purchase Order item child table row */
export interface ErpPurchaseOrderItem extends ErpDocBase {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  warehouse?: string;
  schedule_date: string;
}

/** ERPNext Purchase Order document for supplier orders */
export interface ErpPurchaseOrder extends ErpDocBase {
  name: string;
  supplier: string;
  supplier_name?: string;
  transaction_date: string;
  schedule_date?: string;
  company: string;
  currency: string;
  total_qty: number;
  total: number;
  grand_total: number;
  status: string;
  items: ErpPurchaseOrderItem[];
  ggh_supplier_id?: string;
}

// ============================================
// DELIVERY NOTE
// ============================================

/** Delivery Note item child table row */
export interface ErpDeliveryNoteItem extends ErpDocBase {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  warehouse?: string;
  against_sales_order?: string;
  against_sales_order_item?: string;
}

/** ERPNext Delivery Note document */
export interface ErpDeliveryNote extends ErpDocBase {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  company: string;
  total_qty: number;
  total: number;
  grand_total: number;
  status: string;
  items: ErpDeliveryNoteItem[];
  ggh_order_id?: string;
}

// ============================================
// STOCK ENTRY
// ============================================

/** Stock Entry item child table row */
export interface ErpStockEntryItem extends ErpDocBase {
  item_code: string;
  item_name: string;
  description?: string;
  qty: number;
  uom: string;
  basic_rate: number;
  amount: number;
  s_warehouse?: string;
  t_warehouse?: string;
  transfer_qty?: number;
  serial_no?: string;
  batch_no?: string;
}

/** ERPNext Stock Entry document for inventory movements */
export interface ErpStockEntry extends ErpDocBase {
  name: string;
  stock_entry_type: string;
  purpose: string;
  posting_date: string;
  posting_time: string;
  company: string;
  total_outgoing_value?: number;
  total_incoming_value?: number;
  value_difference?: number;
  items: ErpStockEntryItem[];
  ggh_reference_id?: string;
}

// ============================================
// PAYMENT ENTRY
// ============================================

/** ERPNext Payment Entry document */
export interface ErpPaymentEntry extends ErpDocBase {
  name: string;
  payment_type: string;
  posting_date: string;
  party_type: string;
  party: string;
  paid_amount: number;
  received_amount?: number;
  source_exchange_rate?: number;
  paid_from?: string;
  paid_to?: string;
  reference_no?: string;
  reference_date?: string;
  mode_of_payment?: string;
  status: string;
  references?: ErpPaymentEntryReference[];
  ggh_order_id?: string;
}

/** Payment Entry reference child table */
export interface ErpPaymentEntryReference extends ErpDocBase {
  reference_doctype: string;
  reference_name: string;
  total_amount: number;
  outstanding_amount: number;
  allocated_amount: number;
}

// ============================================
// SALES INVOICE
// ============================================

/** ERPNext Sales Invoice document */
export interface ErpSalesInvoice extends ErpDocBase {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  due_date: string;
  company: string;
  currency: string;
  total_qty: number;
  total: number;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  ggh_order_id?: string;
}

// ============================================
// WAREHOUSE
// ============================================

/** ERPNext Warehouse document */
export interface ErpWarehouse extends ErpDocBase {
  name: string;
  warehouse_name: string;
  warehouse_name_ar?: string;
  warehouse_type?: string;
  parent_warehouse?: string;
  company: string;
  is_group: 0 | 1;
  account?: string;
  city?: string;
  area?: string;
  ggh_warehouse_id?: string;
}

// ============================================
// SUPPLIER
// ============================================

/** ERPNext Supplier document */
export interface ErpSupplier extends ErpDocBase {
  name: string;
  supplier_name: string;
  supplier_name_ar?: string;
  supplier_type?: string;
  supplier_group?: string;
  country?: string;
  phone?: string;
  email_id?: string;
  default_currency?: string;
  default_price_list?: string;
  ggh_supplier_id?: string;
}

// ============================================
// STOCK BALANCE / LEDGER
// ============================================

/** Stock balance result from ERPNext bin query */
export interface ErpStockBalance {
  item_code: string;
  warehouse: string;
  actual_qty: number;
  ordered_qty?: number;
  reserved_qty?: number;
  projected_qty?: number;
  valuation_rate?: number;
  stock_value?: number;
  re_order_level?: number;
}

/** Stock Ledger Entry from ERPNext */
export interface ErpStockLedgerEntry {
  item_code: string;
  warehouse: string;
  posting_date: string;
  posting_time: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate: number;
  stock_value: number;
  voucher_type: string;
  voucher_no: string;
  incoming_rate?: number;
  outgoing_rate?: number;
}

// ============================================
// REORDER LEVEL
// ============================================

/** Item Reorder document */
export interface ErpItemReorder extends ErpDocBase {
  parent: string;
  parentfield: string;
  warehouse: string;
  material_request_type: string;
  warehouse_level: number;
  item_reorder_level: number;
}

// ============================================
// REPORTING TYPES
// ============================================

/** Sales summary from ERPNext reporting */
export interface ErpSalesSummary {
  total_sales: number;       // EGP
  total_orders: number;
  average_order_value: number; // EGP
  total_items_sold: number;
  currency: string;
  from_date: string;
  to_date: string;
}

/** Top selling item from ERPNext */
export interface ErpTopSellingItem {
  item_code: string;
  item_name: string;
  qty_sold: number;
  total_revenue: number; // EGP
}

/** Profit report data from ERPNext */
export interface ErpProfitReport {
  total_revenue: number;   // EGP
  total_cost: number;      // EGP
  gross_profit: number;    // EGP
  gross_margin: number;    // percentage
  currency: string;
  from_date: string;
  to_date: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

/** ERPNext webhook event data */
export interface ErpWebhookEvent {
  /** Event type (e.g., 'insert', 'update', 'delete', 'submit', 'cancel') */
  event: string;
  /** DocType that triggered the event */
  doctype: string;
  /** Document name */
  name: string;
  /** Document data (may be partial) */
  data: Record<string, unknown>;
  /** Timestamp */
  timestamp?: string;
}

// ============================================
// SYNC TYPES
// ============================================

/** ERP sync status for a GGH entity */
export type ErpSyncStatus = 'pending' | 'synced' | 'failed';

/** Entity types that can be synced */
export type ErpEntityType = 'order' | 'customer' | 'product' | 'stock';

/** Sync actions */
export type ErpSyncAction = 'create' | 'update' | 'delete' | 'sync';

/** Result of a sync operation */
export interface ErpSyncResult {
  success: boolean;
  erpDocName?: string;
  error?: string;
  retryCount: number;
}

/** Result of a batch sync operation */
export interface ErpBatchSyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ entityId: string; error: string }>;
}

// ============================================
// GGH-SIDE MAPPED TYPES (for API responses)
// ============================================

/** Stock level as returned to the GGH frontend */
export interface GghStockLevel {
  itemCode: string;
  itemNameEn: string;
  itemNameAr: string;
  warehouse: string;
  actualQty: number;
  reservedQty: number;
  projectedQty: number;
  valuationRate: Piastres;
  stockValue: Piastres;
  reorderLevel: number;
}

/** Warehouse info as returned to the GGH frontend */
export interface GghWarehouseInfo {
  name: string;
  nameEn: string;
  nameAr: string;
  city: string;
  area: string;
  isActive: boolean;
  capacity: number;
  currentLoad: number;
  gghId: string | null;
}

/** Sales summary for GGH dashboard */
export interface GghSalesSummary {
  totalSales: Piastres;
  totalOrders: number;
  averageOrderValue: Piastres;
  totalItemsSold: number;
  fromDate: string;
  toDate: string;
}

/** Top selling item for GGH dashboard */
export interface GghTopSellingItem {
  itemCode: string;
  itemName: BilingualText;
  qtySold: number;
  totalRevenue: Piastres;
}

/** Profit report for GGH dashboard */
export interface GghProfitReport {
  totalRevenue: Piastres;
  totalCost: Piastres;
  grossProfit: Piastres;
  grossMargin: number;
  fromDate: string;
  toDate: string;
}

/** Sync status response */
export interface GghSyncStatus {
  isEnabled: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  recentLogs: Array<{
    id: string;
    entityType: ErpEntityType;
    entityId: string;
    action: ErpSyncAction;
    erpDocType: string;
    status: string;
    error: string | null;
    createdAt: string;
  }>;
}

/** Helper: convert EGP float (as stored in ERPNext) to Piastres integer */
export function egpFloatToPiastres(egp: number): Piastres {
  return Math.round(egp * 100) as Piastres;
}

/** Helper: convert Piastres integer to EGP float (for ERPNext) */
export function piastresToEgpFloat(piastres: Piastres): number {
  return piastres / 100;
}

/** Helper: get bilingual text value based on language */
export function getBilingual(en: string, ar: string, lang: Lang): string {
  return lang === 'ar' ? ar : en;
}

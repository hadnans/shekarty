// GGH — ERPNext Integration Module — Barrel Export
// Re-exports all public APIs from the ERP integration layer

// Configuration
export { getErpConfig, isErpEnabled, resetErpConfig } from './config';
export type { ErpConfig } from './config';

// Client
export {
  erpRequest,
  erpGetDoc,
  erpGetList,
  erpCreateDoc,
  erpUpdateDoc,
  erpDeleteDoc,
  erpCallMethod,
  erpGetCount,
} from './client';
export { ErpError } from './client';
export type { ErpErrorCode, ErpApiResponse, ErpListResponse, ErpRequestOptions } from './client';

// Types
export type {
  ErpDocBase,
  ErpItem,
  ErpCustomer,
  ErpSalesOrder,
  ErpSalesOrderItem,
  ErpPurchaseOrder,
  ErpPurchaseOrderItem,
  ErpDeliveryNote,
  ErpDeliveryNoteItem,
  ErpStockEntry,
  ErpStockEntryItem,
  ErpPaymentEntry,
  ErpPaymentEntryReference,
  ErpSalesInvoice,
  ErpWarehouse,
  ErpSupplier,
  ErpStockBalance,
  ErpStockLedgerEntry,
  ErpItemReorder,
  ErpSalesSummary,
  ErpTopSellingItem,
  ErpProfitReport,
  ErpWebhookEvent,
  ErpSyncStatus,
  ErpEntityType,
  ErpSyncAction,
  ErpSyncResult,
  ErpBatchSyncResult,
  GghStockLevel,
  GghWarehouseInfo,
  GghSalesSummary,
  GghTopSellingItem,
  GghProfitReport,
  GghSyncStatus,
} from './types';
export { egpFloatToPiastres, piastresToEgpFloat, getBilingual } from './types';

// Mappers
export {
  gghProductToErpItem,
  gghCustomerToErpCustomer,
  gghOrderToErpSalesOrder,
  gghOrderItemsToErpItems,
  erpSalesOrderToGgh,
  erpStockBalanceToGgh,
  erpWarehouseToGgh,
  erpSalesSummaryToGgh,
  erpTopSellingItemToGgh,
  erpProfitReportToGgh,
} from './mappers';

// Modules — Inventory
export {
  getStockLevels,
  getStockLedgerEntries,
  createStockEntry,
  getReorderLevels,
  updateReorderLevel,
} from './modules/inventory';

// Modules — Warehouse
export {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  getWarehouseCapacity,
} from './modules/warehouse';

// Modules — Stock Transfer
export {
  createStockTransfer,
  getTransferHistory,
} from './modules/stock-transfer';
export type { StockTransferItem, TransferHistoryRecord } from './modules/stock-transfer';

// Modules — Purchase Order
export {
  createPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder,
} from './modules/purchase-order';
export type { PurchaseOrderItemDef } from './modules/purchase-order';

// Modules — Sales Order
export {
  createSalesOrder,
  getSalesOrders,
  updateSalesOrderStatus,
} from './modules/sales-order';

// Modules — Delivery Note
export {
  createDeliveryNote,
  getDeliveryNotes,
} from './modules/delivery-note';

// Modules — Supplier
export {
  listSuppliers,
  createSupplier,
  getSupplierPricing,
} from './modules/supplier';

// Modules — Customer
export {
  syncCustomer,
  getCustomer,
  getCustomerByGghId,
} from './modules/customer';

// Modules — Accounting
export {
  createPaymentEntry,
  createSalesInvoice,
  getOutstandingInvoices,
} from './modules/accounting';

// Modules — Reporting
export {
  getSalesSummary,
  getStockBalance,
  getTopSellingItems,
  getProfitReport,
} from './modules/reporting';

// Sync Orchestrator
export {
  syncOrderToErp,
  syncAllPendingOrders,
  syncStockFromErp,
  syncCustomerToErp,
  retryFailedSyncs,
  getSyncStatus,
} from './sync';

// Webhook Handler
export {
  verifyWebhookSignature,
  handleStockUpdate,
  handleOrderStatusUpdate,
  handlePaymentUpdate,
  routeWebhook,
} from './webhook';

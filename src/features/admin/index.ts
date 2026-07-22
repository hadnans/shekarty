// GGH — Admin Portal Feature Barrel Exports
// All admin layout and component exports

export { default as AdminLayout } from './components/AdminLayout';
export { default as AdminSidebar } from './components/AdminSidebar';
export { default as AdminTopbar } from './components/AdminTopbar';
export { default as AdminContentArea } from './components/AdminContentArea';
export { default as AdminMobileDrawer } from './components/AdminMobileDrawer';

// Admin sub-view components
export { default as AdminProductManager } from './components/products/AdminProductManager';
export { default as AdminCategoryManager } from './components/categories/AdminCategoryManager';
export { default as AdminDealManager } from './components/deals/AdminDealManager';
export { default as AdminInventoryManager } from './components/inventory/AdminInventoryManager';
export { default as AdminPriceRuleManager } from './components/price-rules/AdminPriceRuleManager';
export { default as BulkImportExport } from './components/bulk/BulkImportExport';
export { default as AdminOrderManager } from './components/orders/AdminOrderManager';
export { default as AdminCustomerManager } from './components/customers/AdminCustomerManager';
export { default as AdminAnalytics } from './components/analytics/AdminAnalytics';
export { default as AdminSettings } from './components/settings/AdminSettings';
export { default as AdminDeliveryManager } from './components/delivery/AdminDeliveryManager';

// Admin shared components
export { default as AdminDataTable } from './components/shared/AdminDataTable';
export { default as StatusBadge } from './components/shared/StatusBadge';
export { default as MoneyCell } from './components/shared/MoneyCell';

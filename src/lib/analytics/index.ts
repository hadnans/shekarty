// GGH Analytics System — Barrel exports

// Configuration
export {
  DEFAULT_ANALYTICS_PERIOD,
  ANALYTICS_PERIODS,
  REVENUE_GRANULARITIES,
  DEFAULT_TOP_PRODUCTS_LIMIT,
  LOW_STOCK_ANALYTICS_THRESHOLD,
  DELIVERY_SLA_MINUTES,
  FAILED_DELIVERY_THRESHOLD_PERCENT,
  type AnalyticsPeriod,
  type RevenueGranularity,
} from './config';

// Types
export {
  type RevenueSummary,
  type RevenueBucket,
  type RevenueOverTimeResult,
  type OrderStatusCount,
  type PaymentStatusSummary,
  type OrderSummary,
  type WholesaleStatusCount,
  type CustomerGrowthPoint,
  type CustomerSummary,
  type ProductPerformanceEntry,
  type LowStockEntry,
  type ProductPerformanceResult,
  type DeliveryStatusCount,
  type DeliveryTimeEntry,
  type DeliveryPerformanceResult,
  type KPIs,
  type AnalyticsQueryInput,
  type RevenueQueryInput,
  type ProductAnalyticsQueryInput,
  type CustomerAnalyticsQueryInput,
  type DeliveryAnalyticsQueryInput,
} from './types';

// Aggregators
export {
  getDateRange,
  getPreviousPeriodStart,
  revenueByPeriod,
  ordersByStatus,
  ordersByPaymentStatus,
  customerGrowth,
  customerGrowthOverTime,
  topProducts,
  lowStockProducts,
  productPerformance,
  deliveryPerformance,
} from './aggregator';

// Service
export {
  getKPIs,
  getRevenueOverTime,
  getProductAnalytics,
  getCustomerAnalytics,
  getDeliveryAnalytics,
} from './service';

// GGH Analytics — Type definitions
// Money values are integer piastres (EGP 14.50 = 1450)

import { type Piastres } from '@/types/ggh';
import { type AnalyticsPeriod, type RevenueGranularity } from './config';

// ============================================
// REVENUE SUMMARY
// ============================================

export interface RevenueSummary {
  total: Piastres;
  delivered: Piastres;
  pending: Piastres;
  subtotal: Piastres;
  deliveryFees: Piastres;
  discounts: Piastres;
  avgOrderValue: Piastres;
  growth: number; // percentage vs previous period
}

export interface RevenueBucket {
  date: string;
  label: string;
  revenue: Piastres;
  orderCount: number;
  deliveryFees: Piastres;
  discounts: Piastres;
  deliveredRevenue: Piastres;
  deliveredOrders: number;
}

export interface RevenueOverTimeResult {
  period: RevenueGranularity;
  startDate: string;
  endDate: string;
  data: RevenueBucket[];
  totals: {
    revenue: Piastres;
    orderCount: number;
    deliveryFees: Piastres;
    discounts: Piastres;
    deliveredRevenue: Piastres;
    deliveredOrders: number;
  };
}

// ============================================
// ORDER SUMMARY
// ============================================

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface PaymentStatusSummary {
  paymentStatus: string;
  count: number;
  totalAmount: Piastres;
}

export interface OrderSummary {
  total: number;
  delivered: number;
  pending: number;
  byStatus: OrderStatusCount[];
  byPaymentStatus: PaymentStatusSummary[];
  growth: number;
}

// ============================================
// CUSTOMER SUMMARY
// ============================================

export interface WholesaleStatusCount {
  wholesaleStatus: string;
  count: number;
}

export interface CustomerGrowthPoint {
  date: string;
  newCustomers: number;
  totalActiveCustomers: number;
}

export interface CustomerSummary {
  new: number;
  total: number;
  byWholesaleStatus: WholesaleStatusCount[];
  growth: number;
  growthData: CustomerGrowthPoint[];
  repeatRate: number;
  avgOrderValue: Piastres;
}

// ============================================
// PRODUCT PERFORMANCE
// ============================================

export interface ProductPerformanceEntry {
  id: string;
  nameEn: string;
  nameAr: string;
  totalSold: number;
  revenue: Piastres;
  todayPrice: Piastres;
  stock: number;
  category: string;
  rating: number;
}

export interface LowStockEntry {
  id: string;
  nameEn: string;
  nameAr: string;
  stock: number;
  lowStockThreshold: number;
  todayPrice: Piastres;
}

export interface ProductPerformanceResult {
  topSellers: ProductPerformanceEntry[];
  lowStock: LowStockEntry[];
  totalActive: number;
  outOfStock: number;
  totalRevenue: Piastres;
  totalSold: number;
}

// ============================================
// DELIVERY PERFORMANCE
// ============================================

export interface DeliveryStatusCount {
  status: string;
  count: number;
}

export interface DeliveryTimeEntry {
  avgDeliveryTimeMinutes: number;
  medianDeliveryTimeMinutes: number;
  minDeliveryTimeMinutes: number;
  maxDeliveryTimeMinutes: number;
}

export interface DeliveryPerformanceResult {
  totalDeliveries: number;
  delivered: number;
  failed: number;
  pending: number;
  avgDeliveryTime: DeliveryTimeEntry;
  slaCompliancePercent: number;
  failedDeliveryPercent: number;
  byStatus: DeliveryStatusCount[];
  activeDeliveries: number;
}

// ============================================
// KPIs
// ============================================

export interface KPIs {
  revenue: RevenueSummary;
  orders: OrderSummary;
  customers: CustomerSummary;
  products: {
    totalActive: number;
    outOfStock: number;
    lowStock: number;
  };
}

// ============================================
// ANALYTICS QUERY INPUT
// ============================================

export interface AnalyticsQueryInput {
  period: AnalyticsPeriod;
  dateFrom?: string;
  dateTo?: string;
}

export interface RevenueQueryInput {
  granularity: RevenueGranularity;
  dateFrom?: string;
  dateTo?: string;
}

export interface ProductAnalyticsQueryInput {
  limit?: number;
  categoryId?: string;
  sortBy?: 'totalSold' | 'revenue';
}

export interface CustomerAnalyticsQueryInput {
  period?: AnalyticsPeriod;
}

export interface DeliveryAnalyticsQueryInput {
  dateFrom?: string;
  dateTo?: string;
}

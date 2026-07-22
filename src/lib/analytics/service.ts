// GGH Analytics — AnalyticsService
// Orchestrates aggregators and formats results into typed summaries

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  DEFAULT_ANALYTICS_PERIOD,
  type RevenueGranularity,
} from './config';
import {
  type KPIs,
  type RevenueSummary,
  type RevenueOverTimeResult,
  type OrderSummary,
  type CustomerSummary,
  type ProductPerformanceResult,
  type DeliveryPerformanceResult,
  type AnalyticsQueryInput,
  type RevenueQueryInput,
  type ProductAnalyticsQueryInput,
  type CustomerAnalyticsQueryInput,
  type DeliveryAnalyticsQueryInput,
} from './types';
import {
  getDateRange,
  getPreviousPeriodStart,
  revenueByPeriod,
  ordersByStatus,
  ordersByPaymentStatus,
  customerGrowth,
  customerGrowthOverTime,
  productPerformance,
  deliveryPerformance,
} from './aggregator';

const logger = createLogger('analytics-service');

// ============================================
// KPIs (Dashboard Summary)
// ============================================

export async function getKPIs(input: AnalyticsQueryInput): Promise<KPIs> {
  const { startDate, endDate } = getDateRange(input.period, input.dateFrom, input.dateTo);

  // Revenue
  const revenueStats = await db.order.aggregate({
    _sum: { totalAmount: true, subtotal: true, deliveryFee: true, discountAmount: true },
    _count: { id: true },
    where: { deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
  });

  const deliveredRevenue = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: { deletedAt: null, status: 'delivered', createdAt: { gte: startDate, lte: endDate } },
  });

  const pendingRevenue = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: { deletedAt: null, status: { in: ['pending', 'confirmed', 'processing', 'shipped'] }, createdAt: { gte: startDate, lte: endDate } },
  });

  // Previous period for growth
  const prevStart = getPreviousPeriodStart(startDate, input.period);
  const prevRevenue = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: { deletedAt: null, createdAt: { gte: prevStart, lt: startDate } },
  });

  const totalRevenue = revenueStats._sum.totalAmount ?? 0;
  const totalOrders = revenueStats._count.id || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const revenueGrowth = prevRevenue._sum.totalAmount
    ? Math.round(((totalRevenue - (prevRevenue._sum.totalAmount || 0)) / (prevRevenue._sum.totalAmount || 1)) * 100)
    : 0;

  // Orders
  const byStatus = await ordersByStatus(startDate, endDate);
  const byPaymentStatus = await ordersByPaymentStatus(startDate, endDate);
  const ordersGrowth = prevRevenue._count.id
    ? Math.round(((totalOrders - (prevRevenue._count.id || 0)) / (prevRevenue._count.id || 1)) * 100)
    : 0;

  // Customers
  const growthData = await customerGrowth(startDate);
  const prevNewCustomers = growthData.previousNewCustomers;
  const customersGrowth = prevNewCustomers
    ? Math.round(((growthData.newCustomers - prevNewCustomers) / (prevNewCustomers || 1)) * 100)
    : 0;

  // Products
  const totalActiveProducts = await db.product.count({ where: { isActive: true, deletedAt: null } });
  const outOfStockProducts = await db.product.count({ where: { stock: 0, isActive: true, deletedAt: null } });
  const lowStockProducts = await db.product.count({ where: { stock: { lte: 10, gt: 0 }, isActive: true, deletedAt: null } });

  logger.info('KPIs calculated', { period: input.period });

  return {
    revenue: {
      total: totalRevenue,
      delivered: deliveredRevenue._sum.totalAmount ?? 0,
      pending: pendingRevenue._sum.totalAmount ?? 0,
      subtotal: revenueStats._sum.subtotal ?? 0,
      deliveryFees: revenueStats._sum.deliveryFee ?? 0,
      discounts: revenueStats._sum.discountAmount ?? 0,
      avgOrderValue,
      growth: revenueGrowth,
    },
    orders: {
      total: totalOrders,
      delivered: deliveredRevenue._count.id || 0,
      pending: pendingRevenue._count.id || 0,
      byStatus,
      byPaymentStatus,
      growth: ordersGrowth,
    },
    customers: {
      new: growthData.newCustomers,
      total: growthData.totalActive,
      byWholesaleStatus: growthData.byWholesaleStatus,
      growth: customersGrowth,
      growthData: [],
      repeatRate: 0,
      avgOrderValue: avgOrderValue,
    },
    products: {
      totalActive: totalActiveProducts,
      outOfStock: outOfStockProducts,
      lowStock: lowStockProducts,
    },
  };
}

// ============================================
// REVENUE OVER TIME
// ============================================

export async function getRevenueOverTime(input: RevenueQueryInput): Promise<RevenueOverTimeResult> {
  const { startDate, endDate } = getDateRange(
    input.granularity === 'daily' ? 'month' : input.granularity === 'weekly' ? 'quarter' : 'year',
    input.dateFrom,
    input.dateTo
  );

  return revenueByPeriod(input.granularity, startDate, endDate);
}

// ============================================
// PRODUCT ANALYTICS
// ============================================

export async function getProductAnalytics(input: ProductAnalyticsQueryInput): Promise<ProductPerformanceResult> {
  return productPerformance(input.limit, input.categoryId);
}

// ============================================
// CUSTOMER ANALYTICS
// ============================================

export async function getCustomerAnalytics(input: CustomerAnalyticsQueryInput): Promise<CustomerSummary> {
  const { startDate } = getDateRange(input.period ?? DEFAULT_ANALYTICS_PERIOD);
  const growthData = await customerGrowth(startDate);

  // Calculate repeat rate
  const totalOrders = await db.order.count({ where: { deletedAt: null } });
  const customersWithMultipleOrders = await db.customer.count({
    where: {
      isActive: true,
      deletedAt: null,
      orders: { some: { deletedAt: null } },
    },
  });

  // Get customers who have more than 1 order
  const repeatCustomers = await db.customer.count({
    where: {
      isActive: true,
      deletedAt: null,
    },
  });

  // Better approach: count distinct customers with >1 order
  const customersWithOrders = await db.order.groupBy({
    by: ['customerId'],
    _count: { id: true },
    where: { deletedAt: null },
  });

  const repeatCount = customersWithOrders.filter((c) => c._count.id > 1).length;
  const totalCustomerCount = customersWithOrders.length;
  const repeatRate = totalCustomerCount > 0 ? repeatCount / totalCustomerCount : 0;

  // Average order value
  const avgResult = await db.order.aggregate({
    _avg: { totalAmount: true },
    where: { deletedAt: null },
  });

  const growthTimeline = await customerGrowthOverTime(startDate, new Date());

  logger.info('Customer analytics calculated', { period: input.period });

  return {
    new: growthData.newCustomers,
    total: growthData.totalActive,
    byWholesaleStatus: growthData.byWholesaleStatus,
    growth: growthData.previousNewCustomers
      ? Math.round(((growthData.newCustomers - growthData.previousNewCustomers) / (growthData.previousNewCustomers || 1)) * 100)
      : 0,
    growthData: growthTimeline,
    repeatRate,
    avgOrderValue: Math.round(avgResult._avg.totalAmount ?? 0),
  };
}

// ============================================
// DELIVERY ANALYTICS
// ============================================

export async function getDeliveryAnalytics(input: DeliveryAnalyticsQueryInput): Promise<DeliveryPerformanceResult> {
  const startDate = input.dateFrom ? new Date(input.dateFrom) : undefined;
  const endDate = input.dateTo ? new Date(input.dateTo) : undefined;

  return deliveryPerformance(startDate, endDate);
}

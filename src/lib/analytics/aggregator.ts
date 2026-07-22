// GGH Analytics — Aggregation functions using Prisma
// Efficient database aggregation queries for analytics data

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  DEFAULT_TOP_PRODUCTS_LIMIT,
  LOW_STOCK_ANALYTICS_THRESHOLD,
  DELIVERY_SLA_MINUTES,
} from './config';
import {
  type RevenueBucket,
  type RevenueOverTimeResult,
  type OrderStatusCount,
  type PaymentStatusSummary,
  type WholesaleStatusCount,
  type CustomerGrowthPoint,
  type ProductPerformanceEntry,
  type LowStockEntry,
  type ProductPerformanceResult,
  type DeliveryStatusCount,
  type DeliveryTimeEntry,
  type DeliveryPerformanceResult,
  type RevenueGranularity,
} from './types';

const logger = createLogger('analytics-aggregator');

// ============================================
// HELPER: Calculate date range from period
// ============================================

export function getDateRange(period: string, dateFrom?: string, dateTo?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  if (dateFrom) {
    startDate = new Date(dateFrom);
  } else {
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  if (dateTo) {
    endDate = new Date(dateTo);
  }

  return { startDate, endDate };
}

/** Calculate previous period start date for comparison */
export function getPreviousPeriodStart(startDate: Date, period: string): Date {
  const duration = new Date().getTime() - startDate.getTime();
  // For "today" use a full day, for other periods use the same duration
  switch (period) {
    case 'today':
      return new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
    case 'quarter':
      return new Date(startDate.getFullYear(), startDate.getMonth() - 3, 1);
    case 'year':
      return new Date(startDate.getFullYear() - 1, 0, 1);
    default:
      return new Date(startDate.getTime() - duration);
  }
}

// ============================================
// REVENUE AGGREGATION
// ============================================

export async function revenueByPeriod(
  granularity: RevenueGranularity,
  startDate: Date,
  endDate: Date
): Promise<RevenueOverTimeResult> {
  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
      totalAmount: true,
      status: true,
      deliveryFee: true,
      discountAmount: true,
      subtotal: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Helper to get date bucket key
  function getDateKey(date: Date): string {
    switch (granularity) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly': {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        const week1 = new Date(d.getFullYear(), 0, 4);
        return `${d.getFullYear()}-W${1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)}`;
      }
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  // Aggregate into buckets
  const bucketMap = new Map<string, RevenueBucket>();

  for (const order of orders) {
    const dateKey = getDateKey(order.createdAt);

    if (!bucketMap.has(dateKey)) {
      bucketMap.set(dateKey, {
        date: dateKey,
        label: dateKey,
        revenue: 0,
        orderCount: 0,
        deliveryFees: 0,
        discounts: 0,
        deliveredRevenue: 0,
        deliveredOrders: 0,
      });
    }

    const bucket = bucketMap.get(dateKey)!;
    bucket.revenue += order.totalAmount;
    bucket.orderCount += 1;
    bucket.deliveryFees += order.deliveryFee;
    bucket.discounts += order.discountAmount;

    if (order.status === 'delivered') {
      bucket.deliveredRevenue += order.totalAmount;
      bucket.deliveredOrders += 1;
    }
  }

  const data = Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  const totals = {
    revenue: data.reduce((sum, b) => sum + b.revenue, 0),
    orderCount: data.reduce((sum, b) => sum + b.orderCount, 0),
    deliveryFees: data.reduce((sum, b) => sum + b.deliveryFees, 0),
    discounts: data.reduce((sum, b) => sum + b.discounts, 0),
    deliveredRevenue: data.reduce((sum, b) => sum + b.deliveredRevenue, 0),
    deliveredOrders: data.reduce((sum, b) => sum + b.deliveredOrders, 0),
  };

  logger.info('Revenue aggregated', { granularity, bucketCount: data.length });

  return {
    period: granularity,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    data,
    totals,
  };
}

// ============================================
// ORDER STATUS AGGREGATION
// ============================================

export async function ordersByStatus(startDate: Date, endDate: Date): Promise<OrderStatusCount[]> {
  const grouped = await db.order.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      deletedAt: null,
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  return grouped.map((g) => ({
    status: g.status,
    count: g._count.id,
  }));
}

export async function ordersByPaymentStatus(startDate: Date, endDate: Date): Promise<PaymentStatusSummary[]> {
  const grouped = await db.order.groupBy({
    by: ['paymentStatus'],
    _count: { id: true },
    _sum: { totalAmount: true },
    where: {
      deletedAt: null,
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  return grouped.map((g) => ({
    paymentStatus: g.paymentStatus,
    count: g._count.id,
    totalAmount: g._sum.totalAmount ?? 0,
  }));
}

// ============================================
// CUSTOMER GROWTH
// ============================================

export async function customerGrowth(startDate: Date): Promise<{
  newCustomers: number;
  totalActive: number;
  byWholesaleStatus: WholesaleStatusCount[];
  previousNewCustomers: number;
}> {
  const newCustomers = await db.customer.count({
    where: { createdAt: { gte: startDate }, isActive: true },
  });

  const totalActive = await db.customer.count({
    where: { isActive: true, deletedAt: null },
  });

  const byWholesaleStatus = await db.customer.groupBy({
    by: ['wholesaleStatus'],
    _count: { id: true },
    where: { isActive: true, deletedAt: null },
  });

  // Previous period new customers
  const periodDuration = new Date().getTime() - startDate.getTime();
  const prevPeriodStart = new Date(startDate.getTime() - periodDuration);
  const previousNewCustomers = await db.customer.count({
    where: {
      createdAt: { gte: prevPeriodStart, lt: startDate },
      isActive: true,
    },
  });

  return {
    newCustomers,
    totalActive,
    byWholesaleStatus: byWholesaleStatus.map((s) => ({
      wholesaleStatus: s.wholesaleStatus,
      count: s._count.id,
    })),
    previousNewCustomers,
  };
}

export async function customerGrowthOverTime(
  startDate: Date,
  endDate: Date
): Promise<CustomerGrowthPoint[]> {
  // Get all new customers in the period with their creation dates
  const newCustomers = await db.customer.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      isActive: true,
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day
  const dayMap = new Map<string, number>();
  for (const c of newCustomers) {
    const dayKey = c.createdAt.toISOString().split('T')[0];
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
  }

  // Build growth data
  const growthData: CustomerGrowthPoint[] = [];
  let cumulative = 0;
  const days = Array.from(dayMap.keys()).sort();

  for (const day of days) {
    cumulative += dayMap.get(day)!;
    growthData.push({
      date: day,
      newCustomers: dayMap.get(day)!,
      totalActiveCustomers: cumulative,
    });
  }

  return growthData;
}

// ============================================
// TOP PRODUCTS
// ============================================

export async function topProducts(limit: number = DEFAULT_TOP_PRODUCTS_LIMIT, categoryId?: string): Promise<ProductPerformanceEntry[]> {
  const where: Record<string, unknown> = {
    isActive: true,
    deletedAt: null,
    totalSold: { gt: 0 },
  };
  if (categoryId) where.categoryId = categoryId;

  const products = await db.product.findMany({
    where,
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      totalSold: true,
      todayPrice: true,
      stock: true,
      rating: true,
      categoryId: true,
      category: { select: { nameEn: true } },
    },
    orderBy: { totalSold: 'desc' },
    take: limit,
  });

  return products.map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    totalSold: p.totalSold,
    revenue: p.totalSold * p.todayPrice, // approximate
    todayPrice: p.todayPrice,
    stock: p.stock,
    category: p.category?.nameEn ?? '',
    rating: p.rating,
  }));
}

// ============================================
// LOW STOCK PRODUCTS
// ============================================

export async function lowStockProducts(): Promise<LowStockEntry[]> {
  const products = await db.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { lte: LOW_STOCK_ANALYTICS_THRESHOLD },
    },
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      stock: true,
      lowStockThreshold: true,
      todayPrice: true,
    },
    orderBy: { stock: 'asc' },
    take: 50,
  });

  return products.map((p) => ({
    id: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    todayPrice: p.todayPrice,
  }));
}

// ============================================
// PRODUCT PERFORMANCE (COMBINED)
// ============================================

export async function productPerformance(
  limit?: number,
  categoryId?: string
): Promise<ProductPerformanceResult> {
  const topSellers = await topProducts(limit ?? DEFAULT_TOP_PRODUCTS_LIMIT, categoryId);
  const lowStock = await lowStockProducts();

  const totalActive = await db.product.count({
    where: { isActive: true, deletedAt: null },
  });

  const outOfStock = await db.product.count({
    where: { stock: 0, isActive: true, deletedAt: null },
  });

  // lowStockCount is derived from the lowStock array length
  // (no separate DB count needed since lowStock already fetched those products)

  return {
    topSellers,
    lowStock,
    totalActive,
    outOfStock,
    totalRevenue: topSellers.reduce((sum, p) => sum + p.revenue, 0),
    totalSold: topSellers.reduce((sum, p) => sum + p.totalSold, 0),
    lowStockCount: lowStock.length,
  };
}

// ============================================
// DELIVERY PERFORMANCE
// ============================================

export async function deliveryPerformance(
  startDate?: Date,
  endDate?: Date
): Promise<DeliveryPerformanceResult> {
  const dateFilter: Record<string, unknown> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const where: Record<string, unknown> = { deletedAt: null };
  if (startDate || endDate) where.createdAt = dateFilter;

  // Get delivery assignments
  const assignments = await db.deliveryAssignment.findMany({
    where: Object.keys(dateFilter).length > 0
      ? { assignedAt: dateFilter as { gte?: Date; lte?: Date } }
      : {},
    select: {
      status: true,
      deliveredAt: true,
      assignedAt: true,
      failedAt: true,
    },
  });

  const totalDeliveries = assignments.length;
  const delivered = assignments.filter((a) => a.status === 'delivered').length;
  const failed = assignments.filter((a) => a.status === 'failed').length;
  const pending = assignments.filter((a) => a.status === 'assigned' || a.status === 'accepted').length;

  // Calculate delivery times for completed deliveries
  const completedTimes = assignments
    .filter((a) => a.status === 'delivered' && a.deliveredAt && a.assignedAt)
    .map((a) => {
      const assignedAt = a.assignedAt instanceof Date ? a.assignedAt : new Date(a.assignedAt);
      const deliveredAt = a.deliveredAt instanceof Date ? a.deliveredAt : new Date(a.deliveredAt);
      return (deliveredAt.getTime() - assignedAt.getTime()) / (1000 * 60); // minutes
    });

  // Calculate SLA compliance
  const slaCompliant = completedTimes.filter((t) => t <= DELIVERY_SLA_MINUTES).length;
  const slaCompliancePercent = completedTimes.length > 0
    ? Math.round((slaCompliant / completedTimes.length) * 100)
    : 0;

  // Calculate avg delivery time
  const avgDeliveryTime: DeliveryTimeEntry = completedTimes.length > 0
    ? {
        avgDeliveryTimeMinutes: Math.round(completedTimes.reduce((sum, t) => sum + t, 0) / completedTimes.length),
        medianDeliveryTimeMinutes: Math.round(completedTimes.sort((a, b) => a - b)[Math.floor(completedTimes.length / 2)]),
        minDeliveryTimeMinutes: Math.round(Math.min(...completedTimes)),
        maxDeliveryTimeMinutes: Math.round(Math.max(...completedTimes)),
      }
    : {
        avgDeliveryTimeMinutes: 0,
        medianDeliveryTimeMinutes: 0,
        minDeliveryTimeMinutes: 0,
        maxDeliveryTimeMinutes: 0,
      };

  // By status
  const statusMap = new Map<string, number>();
  for (const a of assignments) {
    statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1);
  }
  const byStatus: DeliveryStatusCount[] = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // Active deliveries (orders with status shipped/processing)
  const activeDeliveries = await db.order.count({
    where: {
      status: { in: ['shipped', 'out_for_delivery'] },
      deletedAt: null,
    },
  });

  logger.info('Delivery performance calculated', { totalDeliveries, delivered, failed });

  return {
    totalDeliveries,
    delivered,
    failed,
    pending,
    avgDeliveryTime,
    slaCompliancePercent,
    failedDeliveryPercent: totalDeliveries > 0 ? Math.round((failed / totalDeliveries) * 100) : 0,
    byStatus,
    activeDeliveries,
  };
}

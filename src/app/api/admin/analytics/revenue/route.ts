// GGH Admin — Analytics Revenue Over Time
// GET: Revenue data over time (daily/weekly/monthly aggregation)

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminAnalyticsRevenueSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-analytics-revenue');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = adminAnalyticsRevenueSchema.parse(queryParams);
  const { period, dateFrom, dateTo } = validated;

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  if (dateFrom) {
    startDate = new Date(dateFrom);
  } else {
    // Default range based on period
    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // last 12 weeks
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1); // last 12 months
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  if (dateTo) {
    endDate = new Date(dateTo);
  }

  // Fetch all orders within the date range
  const orders = await db.order.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
      totalAmount: true,
      status: true,
      paymentStatus: true,
      deliveryFee: true,
      discountAmount: true,
      subtotal: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group data by period
  type RevenueBucket = {
    date: string;
    label: string;
    revenue: number;
    orderCount: number;
    deliveryFees: number;
    discounts: number;
    subtotal: number;
    deliveredRevenue: number;
    deliveredOrders: number;
  };

  // Helper to format date key based on period
  function getDateKey(date: Date): string {
    switch (period) {
      case 'daily':
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'weekly': {
        // ISO week number
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

  // Helper to generate label from date key
  function getLabel(dateKey: string): string {
    return dateKey;
  }

  // Aggregate orders into buckets
  const bucketMap = new Map<string, RevenueBucket>();

  for (const order of orders) {
    const dateKey = getDateKey(order.createdAt);

    if (!bucketMap.has(dateKey)) {
      bucketMap.set(dateKey, {
        date: dateKey,
        label: getLabel(dateKey),
        revenue: 0,
        orderCount: 0,
        deliveryFees: 0,
        discounts: 0,
        subtotal: 0,
        deliveredRevenue: 0,
        deliveredOrders: 0,
      });
    }

    const bucket = bucketMap.get(dateKey)!;
    bucket.revenue += order.totalAmount;
    bucket.orderCount += 1;
    bucket.deliveryFees += order.deliveryFee;
    bucket.discounts += order.discountAmount;
    bucket.subtotal += order.subtotal;

    if (order.status === 'delivered') {
      bucket.deliveredRevenue += order.totalAmount;
      bucket.deliveredOrders += 1;
    }
  }

  // Convert map to sorted array
  const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Calculate totals
  const totals = {
    revenue: sortedBuckets.reduce((sum, b) => sum + b.revenue, 0),
    orderCount: sortedBuckets.reduce((sum, b) => sum + b.orderCount, 0),
    deliveryFees: sortedBuckets.reduce((sum, b) => sum + b.deliveryFees, 0),
    discounts: sortedBuckets.reduce((sum, b) => sum + b.discounts, 0),
    deliveredRevenue: sortedBuckets.reduce((sum, b) => sum + b.deliveredRevenue, 0),
    deliveredOrders: sortedBuckets.reduce((sum, b) => sum + b.deliveredOrders, 0),
  };

  logger.info('Admin analytics revenue', {
    adminId: admin.id,
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    bucketCount: sortedBuckets.length,
  });

  return successResponse({
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    data: sortedBuckets,
    totals,
    summary: {
      totalRevenue: totals.revenue,
      avgRevenuePerBucket: sortedBuckets.length > 0
        ? Math.round(totals.revenue / sortedBuckets.length)
        : 0,
      avgOrdersPerBucket: sortedBuckets.length > 0
        ? Math.round(totals.orderCount / sortedBuckets.length)
        : 0,
      peakRevenueBucket: sortedBuckets.length > 0
        ? sortedBuckets.reduce((max, b) => b.revenue > max.revenue ? b : max, sortedBuckets[0])
        : null,
    },
  });
});

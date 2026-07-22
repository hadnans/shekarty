// GGH Admin — Analytics Summary
// GET: General analytics: revenue summary, orders summary, customer summary

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminDashboardSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-analytics');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  const { searchParams } = new URL(request.url);
  const queryParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const validated = adminDashboardSchema.parse(queryParams);
  const { period } = validated;

  // Calculate date range based on period
  const now = new Date();
  let startDate: Date;

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
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // ============================================
  // Revenue Summary
  // ============================================

  const revenueStats = await db.order.aggregate({
    _sum: { totalAmount: true, subtotal: true, deliveryFee: true, discountAmount: true },
    _count: { id: true },
    where: {
      deletedAt: null,
      createdAt: { gte: startDate },
    },
  });

  // Delivered revenue (confirmed income)
  const deliveredRevenue = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      deletedAt: null,
      status: 'delivered',
      createdAt: { gte: startDate },
    },
  });

  // Pending revenue (not yet delivered)
  const pendingRevenue = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      deletedAt: null,
      status: { in: ['pending', 'confirmed', 'processing', 'shipped'] },
      createdAt: { gte: startDate },
    },
  });

  // ============================================
  // Orders Summary
  // ============================================

  const totalOrders = revenueStats._count.id || 0;
  const totalRevenue = revenueStats._sum.totalAmount || 0;

  // Orders by status
  const ordersByStatus = await db.order.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      deletedAt: null,
      createdAt: { gte: startDate },
    },
  });

  // Orders by payment status
  const ordersByPaymentStatus = await db.order.groupBy({
    by: ['paymentStatus'],
    _count: { id: true },
    _sum: { totalAmount: true },
    where: {
      deletedAt: null,
      createdAt: { gte: startDate },
    },
  });

  // Average order value
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // ============================================
  // Customer Summary
  // ============================================

  const newCustomers = await db.customer.count({
    where: {
      createdAt: { gte: startDate },
      isActive: true,
    },
  });

  const totalActiveCustomers = await db.customer.count({
    where: { isActive: true, deletedAt: null },
  });

  // Customers by wholesale status
  const customersByWholesaleStatus = await db.customer.groupBy({
    by: ['wholesaleStatus'],
    _count: { id: true },
    where: { isActive: true, deletedAt: null },
  });

  // ============================================
  // Product Summary
  // ============================================

  const totalActiveProducts = await db.product.count({
    where: { isActive: true, deletedAt: null },
  });

  const outOfStockProducts = await db.product.count({
    where: { stock: 0, isActive: true, deletedAt: null },
  });

  const lowStockProducts = await db.product.count({
    where: { stock: { lte: 10, gt: 0 }, isActive: true, deletedAt: null },
  });

  // ============================================
  // Comparison with previous period
  // ============================================

  const periodDuration = now.getTime() - startDate.getTime();
  const prevPeriodStart = new Date(startDate.getTime() - periodDuration);

  const prevRevenue = await db.order.aggregate({
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      deletedAt: null,
      createdAt: { gte: prevPeriodStart, lt: startDate },
    },
  });

  const prevNewCustomers = await db.customer.count({
    where: {
      createdAt: { gte: prevPeriodStart, lt: startDate },
      isActive: true,
    },
  });

  // Calculate growth percentages
  const revenueGrowth = prevRevenue._sum.totalAmount
    ? Math.round(
        ((totalRevenue - (prevRevenue._sum.totalAmount || 0)) /
          (prevRevenue._sum.totalAmount || 1)) *
          100
      )
    : 0;

  const ordersGrowth = prevRevenue._count.id
    ? Math.round(
        ((totalOrders - (prevRevenue._count.id || 0)) /
          (prevRevenue._count.id || 1)) *
          100
      )
    : 0;

  const customersGrowth = prevNewCustomers
    ? Math.round(
        ((newCustomers - prevNewCustomers) / (prevNewCustomers || 1)) * 100
      )
    : 0;

  logger.info('Admin analytics summary', {
    adminId: admin.id,
    period,
  });

  return successResponse({
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    revenue: {
      total: totalRevenue,
      delivered: deliveredRevenue._sum.totalAmount || 0,
      pending: pendingRevenue._sum.totalAmount || 0,
      subtotal: revenueStats._sum.subtotal || 0,
      deliveryFees: revenueStats._sum.deliveryFee || 0,
      discounts: revenueStats._sum.discountAmount || 0,
      avgOrderValue,
      growth: revenueGrowth,
    },
    orders: {
      total: totalOrders,
      delivered: deliveredRevenue._count.id || 0,
      pending: pendingRevenue._count.id || 0,
      byStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      byPaymentStatus: ordersByPaymentStatus.map((s) => ({
        paymentStatus: s.paymentStatus,
        count: s._count.id,
        totalAmount: s._sum.totalAmount || 0,
      })),
      growth: ordersGrowth,
    },
    customers: {
      new: newCustomers,
      total: totalActiveCustomers,
      byWholesaleStatus: customersByWholesaleStatus.map((s) => ({
        wholesaleStatus: s.wholesaleStatus,
        count: s._count.id,
      })),
      growth: customersGrowth,
    },
    products: {
      totalActive: totalActiveProducts,
      outOfStock: outOfStockProducts,
      lowStock: lowStockProducts,
    },
  });
});

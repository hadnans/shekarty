// GGH Admin Dashboard — Stats endpoint
// Returns key metrics for the admin portal dashboard

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiHandler, ValidationError } from '@/lib/errors';
import { requireAdminAuthOrThrow } from '@/lib/ggh/auth/admin-auth';
import { successResponse } from '@/lib/ggh/auth';
import { adminDashboardSchema } from '@/lib/validation/admin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-dashboard');

export const GET = apiHandler(async (request: NextRequest) => {
  const admin = await requireAdminAuthOrThrow();

  // Parse query params for period
  const { searchParams } = new URL(request.url);
  const rawParams = Object.fromEntries(searchParams.entries());
  const parsed = adminDashboardSchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new ValidationError(
      'Invalid query parameters',
      'INVALID_PARAMS',
      parsed.error.flatten().fieldErrors
    );
  }

  const { period } = parsed.data;

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
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  logger.info('Dashboard stats requested', { adminId: admin.id, period });

  // ============================================
  // PARALLEL DATA FETCHING
  // ============================================

  // Low stock products — uses raw SQL because Prisma doesn't support
  // column-to-column comparison in where clause (stock < lowStockThreshold)
  const lowStockResult = await db.$queryRaw<
    Array<{ count: number }>
  >`SELECT COUNT(*) as count FROM products WHERE deletedAt IS NULL AND isActive = 1 AND stock < lowStockThreshold`;

  const [
    ordersToday,
    ordersTodayRevenue,
    totalCustomers,
    pendingOrders,
    activeDeals,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    // Orders today count
    db.order.count({
      where: {
        createdAt: { gte: startDate },
        deletedAt: null,
      },
    }),

    // Orders today total revenue
    db.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: startDate },
        deletedAt: null,
        status: { notIn: ['cancelled', 'refunded'] },
      },
    }),

    // Total customers
    db.customer.count({
      where: { isActive: true, deletedAt: null },
    }),

    // Pending orders count
    db.order.count({
      where: {
        status: 'pending',
        deletedAt: null,
      },
    }),

    // Active deals count
    db.deal.count({
      where: {
        isActive: true,
        endsAt: { gte: now },
      },
    }),

    // Recent 5 orders with customer info
    db.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nameAr: true,
            phone: true,
          },
        },
        items: {
          select: {
            id: true,
            productNameEn: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
    }),

    // Top 5 products by totalSold
    db.product.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { totalSold: 'desc' },
      take: 5,
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        icon: true,
        totalSold: true,
        todayPrice: true,
        stock: true,
        category: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
          },
        },
      },
    }),
  ]);

  const lowStockProducts = Number(lowStockResult[0]?.count ?? 0);

  // ============================================
  // BUILD RESPONSE
  // ============================================

  const totalRevenue = ordersTodayRevenue._sum.totalAmount ?? 0;

  // Transform recent orders
  const recentOrdersData = recentOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: `${order.customer.firstName} ${order.customer.lastName}`,
    customerNameAr: order.customer.nameAr,
    itemsCount: order.items.length,
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
  }));

  // Transform top products
  const topProductsData = topProducts.map((product) => ({
    id: product.id,
    nameEn: product.nameEn,
    nameAr: product.nameAr,
    icon: product.icon,
    totalSold: product.totalSold,
    price: product.todayPrice,
    stock: product.stock,
    category: product.category,
  }));

  const dashboardData = {
    period,
    orders: {
      count: ordersToday,
      totalRevenue,
    },
    totalCustomers,
    lowStockProducts,
    pendingOrders,
    activeDeals,
    recentOrders: recentOrdersData,
    topProducts: topProductsData,
  };

  logger.info('Dashboard stats computed', {
    ordersToday,
    totalRevenue,
    totalCustomers,
    lowStockProducts,
  });

  return successResponse(dashboardData, 'Dashboard stats retrieved');
});

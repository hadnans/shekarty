'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Package, Users, Truck } from 'lucide-react';
import { type Lang, type Piastres, formatPriceWithCurrency, fromPiastres } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import MoneyCell from '../shared/MoneyCell';

// ============================================
// CHART COLORS
// ============================================
const TIER_COLORS: Record<string, string> = {
  retail: '#06b6d4',
  wholesale: '#f59e0b',
  vip: '#8b5cf6',
};

// ============================================
// ADMIN ANALYTICS
// ============================================

interface AdminAnalyticsProps {
  lang: Lang;
}

export default function AdminAnalytics({ lang }: AdminAnalyticsProps) {
  const [revenuePeriod, setRevenuePeriod] = useState('last30');
  const [activeTab, setActiveTab] = useState('revenue');

  // Fetch revenue data
  const { data: revenueResponse, isLoading: isRevenueLoading } = useQuery({
    queryKey: ['admin-analytics-revenue', revenuePeriod],
    queryFn: () => {
      const now = new Date();
      let dateFrom: string;
      switch (revenuePeriod) {
        case 'last7':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'last30':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'last90':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      return adminApi.getRevenue({ dateFrom, dateTo: now.toISOString() });
    },
  });

  // Fetch product analytics
  const { data: productAnalyticsResponse, isLoading: isProductsLoading } = useQuery({
    queryKey: ['admin-analytics-products'],
    queryFn: () => adminApi.getProductAnalytics({ limit: 10 }),
  });

  // Fetch customer analytics
  const { data: customerAnalyticsResponse, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['admin-analytics-customers'],
    queryFn: () => adminApi.getCustomerAnalytics(),
  });

  // Fetch delivery overview
  const { data: deliveryOverviewResponse, isLoading: isDeliveryLoading } = useQuery({
    queryKey: ['admin-analytics-delivery'],
    queryFn: () => adminApi.getDeliveryOverview(),
  });

  // Fetch dashboard stats for KPI cards
  const { data: dashboardStatsResponse, isLoading: isStatsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminApi.getDashboardStats(),
  });

  const revenueData = useMemo(() => revenueResponse?.data || [], [revenueResponse]);
  const productData = productAnalyticsResponse?.data;
  const customerData = customerAnalyticsResponse?.data;
  const deliveryOverview = deliveryOverviewResponse?.data;
  const dashboardStats = dashboardStatsResponse?.data;

  // Prepare chart data
  const revenueChartData = useMemo(() =>
    revenueData.map((point) => ({
      date: point.date,
      revenue: fromPiastres(point.revenue),
      orders: point.orders,
    })),
    [revenueData]
  );

  // KPI cards data
  const kpiCards = useMemo(() => {
    const totalRevenue = dashboardStats?.revenueToday || 0 as Piastres;
    const totalOrders = dashboardStats?.ordersToday || 0;
    const totalCustomers = customerData?.totalCustomers || dashboardStats?.totalCustomers || 0;
    const avgOrderValue = customerData?.avgOrderValue || 0 as Piastres;
    return [
      {
        titleKey: 'adminTotalRevenue',
        value: formatPriceWithCurrency(totalRevenue, lang),
        icon: TrendingUp,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
      },
      {
        titleKey: 'adminTotalOrders',
        value: String(totalOrders),
        icon: Package,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
      },
      {
        titleKey: 'adminTotalCustomers',
        value: String(totalCustomers),
        icon: Users,
        color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30',
      },
      {
        titleKey: 'adminAvgOrderValue',
        value: formatPriceWithCurrency(avgOrderValue, lang),
        icon: Truck,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
      },
    ];
  }, [dashboardStats, customerData, lang]);

  // Top sellers data
  const topSellers = useMemo(() =>
    (productData?.products || dashboardStats?.topProducts || []).slice(0, 5),
    [productData, dashboardStats]
  );

  // Customer tier distribution (mock for pie chart)
  const tierDistribution = useMemo(() => [
    { name: t(lang, 'adminRetailCustomer'), value: 65, tier: 'retail' },
    { name: t(lang, 'adminWholesaleCustomer'), value: 25, tier: 'wholesale' },
    { name: t(lang, 'adminVIPCustomer'), value: 10, tier: 'vip' },
  ], [lang]);

  // Delivery stats
  const deliveryStats = useMemo(() => {
    const active = deliveryOverview?.activeDeliveries || 0;
    const zonesCount = deliveryOverview?.zones?.length || 0;
    const drivers = deliveryOverview?.driversCount || 0;
    return { active, zonesCount, drivers };
  }, [deliveryOverview]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminAnalytics')}</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const KpiIcon = card.icon;
          return (
            <Card key={card.titleKey} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                      {t(lang, card.titleKey)}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {isStatsLoading ? '...' : card.value}
                    </p>
                  </div>
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                    <KpiIcon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">{t(lang, 'adminRevenueTab')}</TabsTrigger>
          <TabsTrigger value="products">{t(lang, 'adminProductsTab')}</TabsTrigger>
          <TabsTrigger value="customers">{t(lang, 'adminCustomersTab')}</TabsTrigger>
          <TabsTrigger value="delivery">{t(lang, 'adminDeliveryTab')}</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">{t(lang, 'adminRevenueOverTime')}</CardTitle>
              <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">{t(lang, 'adminLast7Days')}</SelectItem>
                  <SelectItem value="last30">{t(lang, 'adminLast30Days')}</SelectItem>
                  <SelectItem value="last90">{t(lang, 'adminLast90Days')}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isRevenueLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  {t(lang, 'loading')}
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={(val: string) => {
                        const d = new Date(val);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickFormatter={(val: number) => `${val.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--popover-foreground)',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [`EGP ${value.toLocaleString()}`, t(lang, 'adminTotalRevenue')];
                        return [value, t(lang, 'adminTotalOrders')];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ size: 4 }}
                      activeDot={{ size: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ size: 4 }}
                      activeDot={{ size: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  {t(lang, 'adminNoData')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t(lang, 'adminTopSellers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isProductsLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  {t(lang, 'loading')}
                </div>
              ) : topSellers.length > 0 ? (
                <div className="space-y-3">
                  {topSellers.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="size-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {lang === 'ar' ? product.nameAr : product.nameEn}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.totalSold} sold
                          </p>
                        </div>
                      </div>
                      <MoneyCell value={product.todayPrice} lang={lang} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  {t(lang, 'adminNoData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t(lang, 'adminLowStockCount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-foreground">
                  {dashboardStats?.lowStockCount ?? '—'}
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800">
                  {t(lang, 'adminFilterLowStock')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          {/* Customer Growth */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t(lang, 'adminCustomerGrowth')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isCustomersLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  {t(lang, 'loading')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t(lang, 'adminTotalCustomers')}</p>
                    <p className="text-lg font-bold text-foreground">{customerData?.totalCustomers ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t(lang, 'adminNewCustomers')}</p>
                    <p className="text-lg font-bold text-foreground">{customerData?.newCustomers ?? '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t(lang, 'adminRepeatRate')}</p>
                    <p className="text-lg font-bold text-foreground">
                      {customerData?.repeatRate != null ? `${(customerData.repeatRate * 100).toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t(lang, 'adminAvgOrderValue')}</p>
                    <p className="text-lg font-bold text-foreground">
                      {customerData?.avgOrderValue != null
                        ? formatPriceWithCurrency(customerData.avgOrderValue, lang)
                        : '—'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tier Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t(lang, 'adminTierDistribution')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {tierDistribution.map((entry) => (
                        <Cell key={entry.tier} fill={TIER_COLORS[entry.tier]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t(lang, 'adminActiveDeliveries')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isDeliveryLoading ? '...' : deliveryStats.active}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t(lang, 'adminDeliveryZones')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isDeliveryLoading ? '...' : deliveryStats.zonesCount}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t(lang, 'adminAvailableDrivers')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {isDeliveryLoading ? '...' : deliveryStats.drivers}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

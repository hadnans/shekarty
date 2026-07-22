'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Grid3X3,
  Flame,
  Warehouse,
  DollarSign,
  Upload,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Box,
  Award,
} from 'lucide-react';

import { useAdminStore, type AdminSubView } from '@/stores/admin-store';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// Import admin sub-view components
import AdminProductManager from './products/AdminProductManager';
import AdminCategoryManager from './categories/AdminCategoryManager';
import AdminDealManager from './deals/AdminDealManager';
import AdminInventoryManager from './inventory/AdminInventoryManager';
import AdminPriceRuleManager from './price-rules/AdminPriceRuleManager';
import BulkImportExport from './bulk/BulkImportExport';
import AdminOrderManager from './orders/AdminOrderManager';
import AdminCustomerManager from './customers/AdminCustomerManager';
import AdminAnalytics from './analytics/AdminAnalytics';
import AdminSettings from './settings/AdminSettings';
import AdminDeliveryManager from './delivery/AdminDeliveryManager';
import AdminRbacManager from './rbac/AdminRbacManager';
import LoyaltyProgramManager from './loyalty/LoyaltyProgramManager';

// ============================================
// SUB-VIEW TITLE KEY MAP
// ============================================
const subViewTitleKeys: Record<AdminSubView, string> = {
  dashboard: 'adminDashboard',
  products: 'adminProducts',
  categories: 'adminCategories',
  deals: 'adminDeals',
  inventory: 'adminInventory',
  'price-rules': 'adminPriceRules',
  bulk: 'adminBulk',
  orders: 'adminOrders',
  customers: 'adminCustomers',
  delivery: 'adminDelivery',
  analytics: 'adminAnalytics',
  loyalty: 'adminLoyalty',
  settings: 'adminSettings',
  rbac: 'adminRBAC',
};

const subViewIcons: Record<AdminSubView, React.ComponentType<{ className?: string }>> = {
  dashboard: TrendingUp,
  products: Package,
  categories: Grid3X3,
  deals: Flame,
  inventory: Warehouse,
  'price-rules': DollarSign,
  bulk: Upload,
  orders: ShoppingCart,
  customers: Users,
  delivery: Truck,
  analytics: BarChart3,
  loyalty: Award,
  settings: Settings,
  rbac: Shield,
};

// ============================================
// CONTENT AREA COMPONENT
// ============================================
export default function AdminContentArea() {
  const { lang, isRTL } = useLangStore();
  const { currentSubView } = useAdminStore();

  const titleKey = subViewTitleKeys[currentSubView];
  const pageTitle = t(lang, titleKey);
  const Icon = subViewIcons[currentSubView];

  // Render real sub-view components for implemented views
  const renderSubView = () => {
    switch (currentSubView) {
      case 'products':
        return <AdminProductManager lang={lang} />;
      case 'categories':
        return <AdminCategoryManager lang={lang} />;
      case 'deals':
        return <AdminDealManager lang={lang} />;
      case 'inventory':
        return <AdminInventoryManager lang={lang} />;
      case 'price-rules':
        return <AdminPriceRuleManager lang={lang} />;
      case 'bulk':
        return <BulkImportExport lang={lang} />;
      case 'orders':
        return <AdminOrderManager lang={lang} />;
      case 'customers':
        return <AdminCustomerManager lang={lang} />;
      case 'analytics':
        return <AdminAnalytics lang={lang} />;
      case 'settings':
        return <AdminSettings lang={lang} />;
      case 'delivery':
        return <AdminDeliveryManager lang={lang} />;
      case 'loyalty':
        return <LoyaltyProgramManager lang={lang} />;
      case 'rbac':
        return <AdminRbacManager lang={lang} />;
      default:
        return (
          <PlaceholderSubView
            lang={lang}
            viewId={currentSubView}
            pageTitle={pageTitle}
            Icon={Icon}
          />
        );
    }
  };

  return (
    <div
      data-slot="admin-content-area"
      className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
      id="admin-content"
    >
      <AnimatePresence mode="wait">
        {currentSubView === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <AdminDashboard lang={lang} isRTL={isRTL} />
          </motion.div>
        ) : (
          <motion.div
            key={currentSubView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {renderSubView()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD (Real implementation)
// ============================================
interface AdminDashboardProps {
  lang: 'en' | 'ar';
  isRTL: boolean;
}

function AdminDashboard({ lang }: AdminDashboardProps) {
  // Mock data for the dashboard
  const stats = useMemo(() => [
    {
      titleKey: 'adminTotalOrders',
      value: '1,247',
      change: '+12%',
      icon: ShoppingCart,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      titleKey: 'adminTotalRevenue',
      value: 'EGP 847K',
      change: '+8.3%',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    },
    {
      titleKey: 'adminActiveProducts',
      value: '342',
      change: '+5',
      icon: Box,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    },
    {
      titleKey: 'adminActiveCustomers',
      value: '2,891',
      change: '+156',
      icon: Users,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t(lang, 'adminWelcome')}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t(lang, 'adminOverview')} — {t(lang, 'adminToday')}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5">
          <CheckCircle2 className="size-3.5" />
          {t(lang, 'adminAllSystems')}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const StatIcon = stat.icon;
          return (
            <Card key={stat.titleKey} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">
                      {t(lang, stat.titleKey)}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-emerald-600 font-medium">
                      {stat.change}
                    </p>
                  </div>
                  <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                    <StatIcon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Health + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              {t(lang, 'adminSystemHealth')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthItem label="API Server" status="healthy" progress={98} />
            <HealthItem label="Database" status="healthy" progress={95} />
            <HealthItem label="Redis Cache" status="healthy" progress={92} />
            <HealthItem label="CDN" status="healthy" progress={100} />
          </CardContent>
        </Card>

        {/* Pending + Low Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              {t(lang, 'adminLowStockAlerts')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AlertItem label="Basmati Rice 5kg" count={3} severity="critical" />
            <AlertItem label="Sunflower Oil 1L" count={8} severity="warning" />
            <AlertItem label="Pasta Penne 500g" count={12} severity="warning" />
            <AlertItem label="Sugar 1kg" count={15} severity="info" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            {t(lang, 'adminRecentOrders')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { id: 'ORD-1247', customer: 'Ahmed Hassan', amount: 'EGP 245', status: 'delivered' },
              { id: 'ORD-1246', customer: 'Fatima Ali', amount: 'EGP 189', status: 'processing' },
              { id: 'ORD-1245', customer: 'Mohamed Said', amount: 'EGP 567', status: 'pending' },
              { id: 'ORD-1244', customer: 'Sara Ibrahim', amount: 'EGP 312', status: 'confirmed' },
            ].map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{order.id}</p>
                  <p className="text-xs text-muted-foreground">{order.customer}</p>
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0">{order.amount}</p>
                <OrderStatusBadge status={order.status} lang={lang} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// HELPER SUB-COMPONENTS
// ============================================
function HealthItem({ label, status, progress }: { label: string; status: string; progress: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-xs text-emerald-600 font-medium">{status}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function AlertItem({ label, count, severity }: { label: string; count: number; severity: 'critical' | 'warning' | 'info' }) {
  const colors = {
    critical: 'text-red-600 bg-red-50 dark:bg-red-950/30',
    warning: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    info: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${colors[severity]}`}>
          {count} left
        </span>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status, lang }: { status: string; lang: 'en' | 'ar' }) {
  const statusMap: Record<string, { key: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    delivered: { key: 'delivered', variant: 'default' },
    processing: { key: 'processing', variant: 'secondary' },
    pending: { key: 'pending', variant: 'outline' },
    confirmed: { key: 'confirmed', variant: 'secondary' },
  };

  const config = statusMap[status] || { key: status, variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className="text-xs shrink-0">
      {t(lang, config.key)}
    </Badge>
  );
}

// ============================================
// PLACEHOLDER SUB-VIEW (for views not yet built)
// ============================================
interface PlaceholderSubViewProps {
  lang: 'en' | 'ar';
  viewId: AdminSubView;
  pageTitle: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function PlaceholderSubView({ lang, viewId, pageTitle, Icon }: PlaceholderSubViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {pageTitle}
      </h2>
      <p className="text-muted-foreground text-sm max-w-md">
        {t(lang, 'adminComingSoon')}
      </p>
      <Separator className="my-6 max-w-xs" />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Box className="size-3" />
        <span>Sub-view: {viewId}</span>
      </div>
    </div>
  );
}

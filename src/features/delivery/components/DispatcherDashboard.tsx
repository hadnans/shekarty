'use client';

// GGH DispatcherDashboard — Admin dispatcher view
// Shows summary stats, order list with filters, driver list, assign buttons

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Truck, Users, Package, Clock, CheckCircle2, RefreshCw,
  UserCheck, AlertTriangle, ArrowRight, ArrowLeft,
} from 'lucide-react';
import { type Lang } from '@/types/ggh';
import { fromPiastres, type Piastres } from '@/types/ggh';

interface DispatcherData {
  overview: {
    activeDeliveries: number;
    availableDrivers: number;
    pendingOrders: number;
    ordersBeingPacked: number;
    recentCompletions: number;
    averageDeliveryTime: number;
    deliveriesByStatus: Record<string, number>;
  };
  pendingAssignments: Array<{
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    deliverySlot: string;
    totalAmount: number;
    customerName: string;
    area: string;
  }>;
  activeDeliveries: Array<{
    id: string;
    orderNumber: string;
    status: string;
    assignmentStatus: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    assignedAt: string;
    totalAmount: number;
    area: string;
  }>;
  recentCompletions: Array<{
    id: string;
    orderNumber: string;
    driverName: string;
    deliveredAt: string | null;
    totalAmount: number;
    area: string;
  }>;
}

interface DispatcherDashboardProps {
  lang: Lang;
  onBack?: () => void;
}

/**
 * Admin dispatcher dashboard.
 * Shows summary stats, pending assignments, active deliveries, and recent completions.
 * Includes auto-assign and manual assign actions.
 */
export default function DispatcherDashboard({ lang, onBack }: DispatcherDashboardProps) {
  const [data, setData] = useState<DispatcherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const isRTL = lang === 'ar';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery/dispatcher/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json.data as DispatcherData);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAutoAssign = async (orderId: string) => {
    try {
      const res = await fetch('/api/delivery/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        fetchData(); // Refresh data
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--ggh-primary)' }} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overview, pendingAssignments, activeDeliveries, recentCompletions } = data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
            {lang === 'ar' ? 'لوحة التحكم' : 'Dispatcher Dashboard'}
          </h1>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5" style={{ color: 'var(--ggh-text-secondary)' }} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Truck}
          value={overview.activeDeliveries}
          label={lang === 'ar' ? 'توصيلات نشطة' : 'Active'}
          color="var(--ggh-primary)"
        />
        <StatCard
          icon={Users}
          value={overview.availableDrivers}
          label={lang === 'ar' ? 'سائقين متاحين' : 'Drivers'}
          color="#2E7D32"
        />
        <StatCard
          icon={Package}
          value={overview.pendingOrders}
          label={lang === 'ar' ? 'طلبات معلقة' : 'Pending'}
          color="var(--ggh-accent)"
        />
        <StatCard
          icon={Clock}
          value={`${overview.averageDeliveryTime}m`}
          label={lang === 'ar' ? 'متوسط الوقت' : 'Avg Time'}
          color="#1565C0"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'var(--ggh-bg-alt)' }}>
        {[
          { key: 'pending' as const, label: lang === 'ar' ? 'بانتظار التعيين' : 'Pending', count: pendingAssignments.length },
          { key: 'active' as const, label: lang === 'ar' ? 'نشطة' : 'Active', count: activeDeliveries.length },
          { key: 'completed' as const, label: lang === 'ar' ? 'مكتملة' : 'Completed', count: recentCompletions.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--ggh-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingAssignments.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ggh-text-secondary)' }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{lang === 'ar' ? 'لا توجد طلبات معلقة' : 'No pending assignments'}</p>
            </div>
          ) : (
            pendingAssignments.map((order) => (
              <motion.div
                key={order.id}
                className="rounded-xl p-4 border"
                style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ggh-text)' }}>
                      {order.orderNumber}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
                      {order.customerName} • {order.area}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                      {fromPiastres(order.totalAmount as Piastres)} EGP
                    </p>
                  </div>
                  <button
                    onClick={() => handleAutoAssign(order.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
                  >
                    <UserCheck className="w-4 h-4 inline mr-1" />
                    {lang === 'ar' ? 'تعيين تلقائي' : 'Auto-assign'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="space-y-3">
          {activeDeliveries.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ggh-text-secondary)' }}>
              <Truck className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{lang === 'ar' ? 'لا توجد توصيلات نشطة' : 'No active deliveries'}</p>
            </div>
          ) : (
            activeDeliveries.map((delivery) => (
              <motion.div
                key={delivery.id}
                className="rounded-xl p-4 border"
                style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ggh-text)' }}>
                      {delivery.orderNumber}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
                      {lang === 'ar' ? 'السائق' : 'Driver'}: {delivery.driverName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                      {delivery.area} • {fromPiastres(delivery.totalAmount as Piastres)} EGP
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: '#E8F5E9',
                      color: 'var(--ggh-primary)',
                    }}
                  >
                    {delivery.assignmentStatus}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="space-y-3">
          {recentCompletions.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ggh-text-secondary)' }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{lang === 'ar' ? 'لا توجد توصيلات مكتملة' : 'No recent completions'}</p>
            </div>
          ) : (
            recentCompletions.map((completion) => (
              <motion.div
                key={completion.id}
                className="rounded-xl p-4 border"
                style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--ggh-text)' }}>
                    {completion.orderNumber}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {lang === 'ar' ? 'السائق' : 'Driver'}: {completion.driverName} • {completion.area}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {fromPiastres(completion.totalAmount as Piastres)} EGP
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Stat card component */
function StatCard({ icon: Icon, value, label, color }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 border"
      style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
    >
      <Icon className="w-5 h-5 mb-1" style={{ color }} />
      <p className="text-xl font-bold" style={{ color: 'var(--ggh-text)' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>{label}</p>
    </div>
  );
}

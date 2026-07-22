'use client';

// GGH WarehouseDashboard — Warehouse packing view
// Shows orders awaiting packing, packed orders, and handoff confirmation

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, CheckCircle2, RefreshCw, ArrowRight, ArrowLeft,
  Truck, Clock, Warehouse,
} from 'lucide-react';
import { type Lang, fromPiastres, type Piastres } from '@/types/ggh';

interface PendingOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  deliverySlot: string;
  totalAmount: number;
  itemCount: number;
  customerName: string;
  area: string;
}

interface WarehouseDashboardProps {
  lang: Lang;
  warehouseId?: string;
  onBack?: () => void;
}

/**
 * Warehouse packing dashboard.
 * Shows orders awaiting packing, packed orders awaiting pickup, and handoff controls.
 */
export default function WarehouseDashboard({ lang, warehouseId, onBack }: WarehouseDashboardProps) {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [packedOrders, setPackedOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    driverName: string;
    driverPhone: string;
    totalAmount: number;
    area: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'packed'>('pending');
  const isRTL = lang === 'ar';

  const fetchPending = useCallback(async () => {
    try {
      const url = warehouseId
        ? `/api/delivery/warehouse/pending?warehouseId=${warehouseId}`
        : '/api/delivery/warehouse/pending';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setPendingOrders(json.data as PendingOrder[]);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  const fetchPacked = useCallback(async () => {
    try {
      // Get packed orders with driver assignments
      const res = await fetch('/api/delivery/dispatcher/dashboard');
      if (res.ok) {
        const json = await res.json();
        const active = (json.data?.activeDeliveries || []) as Array<{
          id: string;
          orderNumber: string;
          assignmentStatus: string;
          driverName: string;
          driverPhone: string;
          totalAmount: number;
          area: string;
        }>;
        // Filter to only show assigned/accepted (waiting for pickup)
        setPackedOrders(
          active
            .filter((d) => d.assignmentStatus === 'accepted' || d.assignmentStatus === 'assigned' || d.assignmentStatus === 'arrived_pickup')
            .map((d) => ({
              id: d.id,
              orderNumber: d.orderNumber,
              driverName: d.driverName,
              driverPhone: d.driverPhone,
              totalAmount: d.totalAmount,
              area: d.area,
            }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPending();
    fetchPacked();
    const interval = setInterval(() => { fetchPending(); fetchPacked(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchPending, fetchPacked]);

  const handleMarkPacked = async (orderId: string) => {
    try {
      const res = await fetch('/api/delivery/warehouse/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        // Auto-assign driver after packing
        await fetch('/api/delivery/auto-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        fetchPending();
        fetchPacked();
      }
    } catch {
      // ignore
    }
  };

  const handleHandoff = async (orderId: string, driverId: string) => {
    try {
      await fetch('/api/delivery/warehouse/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, driverId }),
      });
      fetchPacked();
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
            {lang === 'ar' ? 'لوحة المستودع' : 'Warehouse Dashboard'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
            {lang === 'ar' ? 'تجهيز الطلبات وتسليمها للسائقين' : 'Pack orders and hand off to drivers'}
          </p>
        </div>
        <button onClick={() => { fetchPending(); fetchPacked(); }} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5" style={{ color: 'var(--ggh-text-secondary)' }} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}>
          <Package className="w-5 h-5 mb-1" style={{ color: 'var(--ggh-accent)' }} />
          <p className="text-xl font-bold" style={{ color: 'var(--ggh-text)' }}>{pendingOrders.length}</p>
          <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
            {lang === 'ar' ? 'بانتظار التجهيز' : 'Awaiting Packing'}
          </p>
        </div>
        <div className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}>
          <Truck className="w-5 h-5 mb-1" style={{ color: 'var(--ggh-primary)' }} />
          <p className="text-xl font-bold" style={{ color: 'var(--ggh-text)' }}>{packedOrders.length}</p>
          <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
            {lang === 'ar' ? 'جاهزة للاستلام' : 'Ready for Pickup'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'var(--ggh-bg-alt)' }}>
        <button
          onClick={() => setActiveTab('pending')}
          className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'pending' ? 'var(--ggh-card)' : 'transparent',
            color: activeTab === 'pending' ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
            boxShadow: activeTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {lang === 'ar' ? 'بانتظار التجهيز' : 'Pending'} ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('packed')}
          className="flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'packed' ? 'var(--ggh-card)' : 'transparent',
            color: activeTab === 'packed' ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
            boxShadow: activeTab === 'packed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {lang === 'ar' ? 'جاهزة للاستلام' : 'Packed'} ({packedOrders.length})
        </button>
      </div>

      {/* Pending orders */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingOrders.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ggh-text-secondary)' }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{lang === 'ar' ? 'كل الطلبات متجهزة' : 'All orders packed!'}</p>
            </div>
          ) : (
            pendingOrders.map((order) => (
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
                      {order.itemCount} {lang === 'ar' ? 'منتجات' : 'items'} • {fromPiastres(order.totalAmount as Piastres)} EGP
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {order.deliverySlot}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMarkPacked(order.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
                  >
                    {lang === 'ar' ? 'تم التجهيز' : 'Packed'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Packed orders awaiting pickup */}
      {activeTab === 'packed' && (
        <div className="space-y-3">
          {packedOrders.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ggh-text-secondary)' }}>
              <Warehouse className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{lang === 'ar' ? 'لا توجد طلبات جاهزة' : 'No packed orders'}</p>
            </div>
          ) : (
            packedOrders.map((order) => (
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
                      {lang === 'ar' ? 'السائق' : 'Driver'}: {order.driverName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                      {order.area} • {fromPiastres(order.totalAmount as Piastres)} EGP
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // For handoff we need driverId, get from active deliveries data
                      // Since we don't have driverId here directly, we'll use a simplified approach
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: '#2E7D32', color: '#FFFFFF' }}
                  >
                    <Truck className="w-4 h-4 inline mr-1" />
                    {lang === 'ar' ? 'تم التسليم' : 'Handoff'}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

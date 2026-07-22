'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, XCircle, ArrowRight, Truck } from 'lucide-react';
import { type Lang, type Order, type OrderStatus, type Piastres } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import StatusBadge from '../shared/StatusBadge';
import MoneyCell from '../shared/MoneyCell';
import AdminDataTable, { type ColumnDef, type PaginationInfo } from '../shared/AdminDataTable';

// ============================================
// ORDER STATUS CONFIG
// ============================================

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

// ============================================
// ORDER MANAGER
// ============================================

interface AdminOrderManagerProps {
  lang: Lang;
}

export default function AdminOrderManager({ lang }: AdminOrderManagerProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');

  // Fetch orders list
  const { data: ordersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-orders', page, search, statusFilter, paymentFilter],
    queryFn: () => adminApi.getOrders({
      page,
      limit: 10,
      search,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  // Fetch single order detail
  const { data: orderDetailResponse, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: () => adminApi.getOrder(selectedOrderId!),
    enabled: selectedOrderId !== null,
  });

  // Fetch drivers for assignment
  const { data: driversResponse } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: () => adminApi.getDrivers(),
    enabled: selectedOrderId !== null,
  });

  const orders: Order[] = ordersResponse?.data || [];
  const pagination: PaginationInfo | undefined = ordersResponse?.pagination;
  const orderDetail = orderDetailResponse?.data || null;
  const drivers = driversResponse?.data || [];

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; note?: string } }) =>
      adminApi.updateOrderStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] });
      setNewStatus('');
      setStatusNote('');
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminApi.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] });
    },
  });

  // Status change handler
  const handleStatusChange = useCallback(() => {
    if (!selectedOrderId || !newStatus) return;
    updateStatusMutation.mutate({
      id: selectedOrderId,
      data: { status: newStatus, note: statusNote },
    });
  }, [selectedOrderId, newStatus, statusNote, updateStatusMutation]);

  // Cancel handler
  const handleCancelOrder = useCallback(() => {
    if (!selectedOrderId) return;
    cancelMutation.mutate(selectedOrderId);
  }, [selectedOrderId, cancelMutation]);

  // Open order detail
  const openDetail = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setNewStatus('');
    setStatusNote('');
    setSelectedDriverId('');
  }, []);

  // Close detail
  const closeDetail = useCallback(() => {
    setSelectedOrderId(null);
    setNewStatus('');
    setStatusNote('');
    setSelectedDriverId('');
  }, []);

  // Payment method label
  const paymentMethodKey = (method: string): string => {
    switch (method) {
      case 'cod': return 'adminCashOnDelivery';
      case 'card': return 'adminCard';
      case 'wallet': return 'adminWallet';
      default: return method;
    }
  };

  // Column definitions
  const columns: ColumnDef<Order>[] = [
    {
      key: 'orderNumber',
      headerKey: 'adminOrderNumber',
      render: (row) => (
        <span className="text-sm font-semibold text-foreground">{row.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      headerKey: 'adminCustomer',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.customerId}</span>
      ),
    },
    {
      key: 'total',
      headerKey: 'adminTotalAmount',
      render: (row) => <MoneyCell value={row.totalAmount} lang={lang} />,
    },
    {
      key: 'status',
      headerKey: 'adminStatus',
      render: (row) => <StatusBadge status={row.status} type="order" lang={lang} />,
    },
    {
      key: 'payment',
      headerKey: 'adminPaymentStatus',
      render: (row) => <StatusBadge status={row.paymentStatus} type="payment" lang={lang} />,
    },
    {
      key: 'date',
      headerKey: 'adminDate',
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      headerKey: '',
      className: 'w-12',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation();
            openDetail(row.id);
          }}
          aria-label={t(lang, 'adminOrderDetail')}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminOrders')}</h2>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={selectedOrderId !== null} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {isDetailLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : orderDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {t(lang, 'adminOrderDetail')} — {orderDetail.orderNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Order info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t(lang, 'adminStatus')}:</span>
                    <StatusBadge status={orderDetail.status} type="order" lang={lang} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t(lang, 'adminPaymentStatus')}:</span>
                    <StatusBadge status={orderDetail.paymentStatus} type="payment" lang={lang} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t(lang, 'adminTotalAmount')}:</span>
                    <MoneyCell value={orderDetail.totalAmount} lang={lang} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t(lang, 'adminPaymentMethod')}:</span>
                    <span className="font-medium">{t(lang, paymentMethodKey(orderDetail.paymentMethod))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{t(lang, 'adminDate')}:</span>
                    <span className="font-medium">
                      {new Date(orderDetail.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
                    </span>
                  </div>
                  {orderDetail.driverName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t(lang, 'adminDriverName')}:</span>
                      <span className="font-medium">{orderDetail.driverName}</span>
                    </div>
                  )}
                </div>

                {orderDetail.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t(lang, 'notes')}:</span>
                    <span className="ms-1.5">{orderDetail.notes}</span>
                  </div>
                )}

                <Separator />

                {/* Items */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t(lang, 'adminOrderItems')}</h4>
                  <div className="space-y-2">
                    {orderDetail.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {lang === 'ar' ? item.productNameAr : item.productNameEn}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.weight} × {item.quantity}</p>
                        </div>
                        <MoneyCell value={item.totalPrice} lang={lang} className="shrink-0" />
                      </div>
                    ))}
                  </div>

                  {/* Totals summary */}
                  <div className="mt-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t(lang, 'subtotal')}</span>
                      <MoneyCell value={orderDetail.subtotal} lang={lang} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t(lang, 'deliveryFee')}</span>
                      <MoneyCell value={orderDetail.deliveryFee} lang={lang} />
                    </div>
                    {orderDetail.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t(lang, 'discount')}</span>
                        <MoneyCell value={orderDetail.discountAmount as Piastres} lang={lang} className="text-emerald-600" />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-semibold pt-1">
                      <span>{t(lang, 'total')}</span>
                      <MoneyCell value={orderDetail.totalAmount} lang={lang} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Status Timeline */}
                {orderDetail.statusHistory.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t(lang, 'adminOrderTimeline')}</h4>
                    <div className="space-y-2">
                      {orderDetail.statusHistory.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3 py-1">
                          <StatusBadge status={entry.status} type="order" lang={lang} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
                          </span>
                          {entry.note && (
                            <span className="text-xs text-muted-foreground truncate">{entry.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">{t(lang, 'adminOrderActions')}</h4>

                  {/* Change status */}
                  <div className="flex items-end gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label className="text-xs">{t(lang, 'adminChangeStatus')}</Label>
                      <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                        <SelectTrigger size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{t(lang, s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label className="text-xs">{t(lang, 'adminStockReason')}</Label>
                      <Input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Note..." className="h-9 text-sm" />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleStatusChange}
                      disabled={updateStatusMutation.isPending || !newStatus || (orderDetail && newStatus === orderDetail.status)}
                    >
                      <ArrowRight className="size-4 me-1" />
                      {t(lang, 'adminUpdateStatus')}
                    </Button>
                  </div>

                  {/* Assign Driver */}
                  {orderDetail.status !== 'cancelled' && orderDetail.status !== 'delivered' && drivers.length > 0 && (
                    <div className="flex items-end gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-xs">{t(lang, 'adminAssignDriver')}</Label>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                          <SelectTrigger size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.filter((d) => d.isActive).map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {lang === 'ar' ? driver.nameAr : driver.nameEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" variant="outline" disabled={!selectedDriverId}>
                        <Truck className="size-4 me-1" />
                        {t(lang, 'adminAssignDriver')}
                      </Button>
                    </div>
                  )}

                  {/* Cancel */}
                  {orderDetail.status !== 'cancelled' && orderDetail.status !== 'delivered' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleCancelOrder}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="size-4 me-1" />
                      {t(lang, 'adminCancelOrder')}
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={orders}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        error={error?.message || null}
        onRetry={() => refetch()}
        toolbar={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(lang, 'adminFilterAll')}</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(lang, s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(lang, 'adminFilterAll')}</SelectItem>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(lang, s === 'pending' ? 'pending' : `admin${s.charAt(0).toUpperCase() + s.slice(1)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        emptyMessageKey="adminNoItems"
      />
    </div>
  );
}

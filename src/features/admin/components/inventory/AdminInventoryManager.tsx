'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpDown, Package, XCircle, TrendingDown } from 'lucide-react';
import { type Lang, type Product } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLangStore } from '@/stores/lang-store';
import StatusBadge from '../shared/StatusBadge';
import AdminDataTable, { type ColumnDef, type PaginationInfo } from '../shared/AdminDataTable';

// ============================================
// INVENTORY MANAGER
// ============================================

interface AdminInventoryManagerProps {
  lang: Lang;
}

type StockTab = 'all' | 'low' | 'out_of_stock';

export default function AdminInventoryManager({ lang }: AdminInventoryManagerProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StockTab>('all');
  const [adjustDialog, setAdjustDialog] = useState<Product | null>(null);

  // Determine API filter based on tab
  const lowStockFilter = tab === 'low' || tab === 'out_of_stock';

  // Fetch inventory
  const { data: inventoryResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-inventory', page, lowStockFilter, search],
    queryFn: () => adminApi.getInventory({ page, limit: 10, lowStock: lowStockFilter }),
  });

  // Fetch ALL inventory for summary stats (not paginated)
  const { data: allInventoryResponse } = useQuery({
    queryKey: ['admin-inventory-stats'],
    queryFn: () => adminApi.getInventory({ page: 1, limit: 200 }),
  });

  // Fetch low stock alerts
  const { data: lowStockResponse } = useQuery({
    queryKey: ['admin-low-stock-alerts'],
    queryFn: () => adminApi.getInventory({ page: 1, limit: 10, lowStock: true }),
  });

  const products = inventoryResponse?.data || [];
  const pagination: PaginationInfo | undefined = inventoryResponse?.pagination;
  const allProducts = allInventoryResponse?.data || [];
  const lowStockProducts = lowStockResponse?.data || [];

  // Summary stats
  const stats = useMemo(() => {
    const total = allProducts.length;
    const lowStockCount = allProducts.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
    const outOfStockCount = allProducts.filter((p) => p.stock === 0).length;
    return { total, lowStockCount, outOfStockCount };
  }, [allProducts]);

  // Get stock status
  const getStockStatus = (product: Product): string => {
    if (product.stock === 0) return 'out_of_stock';
    if (product.stock <= product.lowStockThreshold / 2) return 'critical';
    if (product.stock <= product.lowStockThreshold) return 'low';
    return 'ok';
  };

  // Client-side tab filtering for 'out_of_stock' (API doesn't distinguish)
  const displayProducts = useMemo(() => {
    if (tab === 'out_of_stock') {
      return products.filter((p) => p.stock === 0);
    }
    return products;
  }, [products, tab]);

  // Stock adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: adminApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-low-stock-alerts'] });
      setAdjustDialog(null);
      resetAdjustForm();
    },
  });

  // Adjustment form
  const [adjustForm, setAdjustForm] = useState({
    mode: 'add' as 'add' | 'subtract' | 'set',
    amount: 0,
    reason: '',
  });

  const resetAdjustForm = () => {
    setAdjustForm({ mode: 'add', amount: 0, reason: '' });
  };

  const handleAdjust = () => {
    if (!adjustDialog) return;
    let adjustment = adjustForm.amount;
    if (adjustForm.mode === 'subtract') adjustment = -adjustment;
    if (adjustForm.mode === 'set') adjustment = adjustForm.amount - adjustDialog.stock;

    adjustMutation.mutate({
      productId: adjustDialog.id,
      adjustment,
      reason: adjustForm.reason || (adjustForm.mode === 'set' ? 'Set quantity' : adjustForm.mode === 'add' ? 'Stock added' : 'Stock removed'),
    });
  };

  // Column definitions
  const columns: ColumnDef<Product>[] = [
    {
      key: 'name',
      headerKey: 'adminNameEn',
      render: (row, l) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {l === 'ar' ? row.nameAr : row.nameEn}
          </p>
          <p className="text-xs text-muted-foreground truncate">{row.weight} {row.unit}</p>
        </div>
      ),
    },
    {
      key: 'stock',
      headerKey: 'adminStockQty',
      className: 'w-20',
      render: (row) => (
        <span className={`text-sm font-semibold ${row.stock === 0 ? 'text-destructive' : row.stock <= row.lowStockThreshold ? 'text-amber-600' : 'text-foreground'}`}>
          {row.stock}
        </span>
      ),
    },
    {
      key: 'threshold',
      headerKey: 'adminThreshold',
      className: 'w-20',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.lowStockThreshold}</span>
      ),
    },
    {
      key: 'status',
      headerKey: 'adminStatus',
      className: 'w-24',
      render: (row) => <StatusBadge status={getStockStatus(row)} lang={lang} />,
    },
    {
      key: 'actions',
      headerKey: '',
      className: 'w-28',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => {
          setAdjustDialog(row);
          setAdjustForm({ mode: 'add', amount: 0, reason: '' });
        }}>
          <ArrowUpDown className="size-3.5 me-1" />
          {t(lang, 'adminAdjustStock')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminInventory')}</h2>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
              <Package className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t(lang, 'adminActiveProducts')}</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStockCount > 0 ? 'border-amber-200 dark:border-amber-800/40' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
              <TrendingDown className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t(lang, 'adminFilterLowStock')}</p>
              <p className="text-2xl font-bold text-foreground">{stats.lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.outOfStockCount > 0 ? 'border-red-200 dark:border-red-800/40' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
              <XCircle className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{t(lang, 'outOfStock')}</p>
              <p className="text-2xl font-bold text-foreground">{stats.outOfStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Stock Alerts */}
      {lowStockProducts.filter((p) => p.stock <= p.lowStockThreshold / 2 || p.stock === 0).length > 0 && (
        <Card className="border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="size-4 text-red-500" />
              {lang === 'ar' ? '⚠ تنبيه: مخزون حرج' : '⚠ Critical Stock Alert'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts
                .filter((p) => p.stock <= p.lowStockThreshold / 2 || p.stock === 0)
                .map((product) => {
                  const status = getStockStatus(product);
                  const name = lang === 'ar' ? product.nameAr : product.nameEn;
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-background border border-red-200 dark:border-red-800/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{product.weight} {product.unit}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${product.stock === 0 ? 'text-destructive' : 'text-red-600'}`}>
                          {product.stock}
                        </span>
                        <StatusBadge status={status} lang={lang} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setAdjustDialog(product);
                            setAdjustForm({ mode: 'add', amount: 0, reason: '' });
                          }}
                        >
                          <ArrowUpDown className="size-3 me-0.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adjustment Dialog */}
      <Dialog open={adjustDialog !== null} onOpenChange={(open) => { if (!open) setAdjustDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t(lang, 'adminAdjustStock')} — {adjustDialog ? (lang === 'ar' ? adjustDialog.nameAr : adjustDialog.nameEn) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30">
              <span className="text-muted-foreground">{t(lang, 'adminStockQty')}:</span>
              <span className="font-semibold">{adjustDialog?.stock}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-muted-foreground">{t(lang, 'adminThreshold')}:</span>
              <span className="font-semibold">{adjustDialog?.lowStockThreshold}</span>
              {adjustDialog && <StatusBadge status={getStockStatus(adjustDialog)} lang={lang} />}
            </div>

            <div className="space-y-2">
              <Label>{t(lang, 'adminStockAdjustment')}</Label>
              <Select value={adjustForm.mode} onValueChange={(v) => setAdjustForm((prev) => ({ ...prev, mode: v as 'add' | 'subtract' | 'set' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">{t(lang, 'adminStockAdd')}</SelectItem>
                  <SelectItem value="subtract">{t(lang, 'adminStockSubtract')}</SelectItem>
                  <SelectItem value="set">{t(lang, 'adminStockSet')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {adjustForm.mode === 'set' ? t(lang, 'adminStockSetTo') : t(lang, 'adminStockAdjustment')}
              </Label>
              <Input
                type="number"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm((prev) => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                min={0}
              />
            </div>

            {/* Preview result */}
            {adjustDialog && adjustForm.amount > 0 && (
              <div className="text-xs p-2 rounded-md bg-muted/30 text-muted-foreground">
                {lang === 'ar' ? 'النتيجة:' : 'Result:'}{' '}
                <span className="font-semibold text-foreground">
                  {adjustForm.mode === 'add'
                    ? adjustDialog.stock + adjustForm.amount
                    : adjustForm.mode === 'subtract'
                      ? Math.max(0, adjustDialog.stock - adjustForm.amount)
                      : adjustForm.amount}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t(lang, 'adminStockReason')}</Label>
              <Input
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t(lang, 'adminStockReason')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>{t(lang, 'cancel')}</Button>
            <Button disabled={adjustMutation.isPending} onClick={handleAdjust}>
              {adjustMutation.isPending ? t(lang, 'loading') : t(lang, 'adminSaveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as StockTab); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">{t(lang, 'adminFilterAll')}</TabsTrigger>
          <TabsTrigger value="low">{t(lang, 'adminFilterLowStock')}</TabsTrigger>
          <TabsTrigger value="out_of_stock">{t(lang, 'outOfStock')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={displayProducts}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        error={error instanceof Error ? error.message : null}
        onRetry={() => refetch()}
        emptyMessageKey="adminNoItems"
      />
    </div>
  );
}

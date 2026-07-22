'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Square, MoreVertical, Search } from 'lucide-react';
import { type Lang, type Deal, type Piastres, type Product, toPiastres, formatPriceWithCurrency, calcDiscountPercent } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLangStore } from '@/stores/lang-store';
import StatusBadge from '../shared/StatusBadge';
import MoneyCell from '../shared/MoneyCell';
import AdminDataTable, { type ColumnDef, type PaginationInfo } from '../shared/AdminDataTable';

// ============================================
// DEAL MANAGER
// ============================================

interface AdminDealManagerProps {
  lang: Lang;
}

type DealTab = 'all' | 'active' | 'expired';

export default function AdminDealManager({ lang }: AdminDealManagerProps) {
  const { isRTL } = useLangStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<DealTab>('all');
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch deals
  const isActiveFilter = tab === 'active' ? true : tab === 'expired' ? false : undefined;
  const { data: dealsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-deals', page, isActiveFilter],
    queryFn: () => adminApi.getDeals({ page, limit: 10, isActive: isActiveFilter }),
  });

  // Fetch products for picker (searchable)
  const [productSearch, setProductSearch] = useState('');
  const { data: productsResponse } = useQuery({
    queryKey: ['admin-products-picker', productSearch],
    queryFn: () => adminApi.getProducts({ limit: 50, search: productSearch }),
  });

  const products = productsResponse?.data || [];
  const deals = dealsResponse?.data || [];
  const pagination: PaginationInfo | undefined = dealsResponse?.pagination;

  // Mutations
  const createMutation = useMutation({
    mutationFn: adminApi.createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deal> }) => adminApi.updateDeal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
      setEditDeal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
    },
  });

  const endDealMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => adminApi.updateDeal(id, { isActive: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deals'] });
    },
  });

  // Form state
  const [form, setForm] = useState({
    productId: '',
    dealPrice: 0,
    originalPrice: 0,
    discountPercent: 0,
    startsAt: '',
    endsAt: '',
    maxQuantity: 100,
    isActive: true,
  });

  const resetForm = () => {
    setForm({
      productId: '', dealPrice: 0, originalPrice: 0, discountPercent: 0,
      startsAt: '', endsAt: '', maxQuantity: 100, isActive: true,
    });
    setProductSearch('');
  };

  const openEdit = (deal: Deal) => {
    setForm({
      productId: deal.productId,
      dealPrice: deal.dealPrice / 100,
      originalPrice: deal.originalPrice / 100,
      discountPercent: deal.discountPercent,
      startsAt: '', // startsAt not in Deal type, leave empty for edit
      endsAt: deal.endsAt,
      maxQuantity: deal.maxQuantity,
      isActive: deal.isActive,
    });
    setEditDeal(deal);
  };

  const handleSave = () => {
    if (editDeal) {
      updateMutation.mutate({
        id: editDeal.id,
        data: {
          ...form,
          dealPrice: toPiastres(form.dealPrice),
          originalPrice: toPiastres(form.originalPrice),
          discountPercent: form.discountPercent || calcDiscountPercent(toPiastres(form.dealPrice), toPiastres(form.originalPrice)),
        } as Partial<Deal>,
      });
    } else {
      createMutation.mutate({
        ...form,
        dealPrice: toPiastres(form.dealPrice) as Piastres,
        originalPrice: toPiastres(form.originalPrice) as Piastres,
        discountPercent: form.discountPercent || calcDiscountPercent(toPiastres(form.dealPrice), toPiastres(form.originalPrice)),
      } as Partial<Deal> & { productId: string; dealPrice: Piastres; originalPrice: Piastres; endsAt: string });
    }
  };

  // Column definitions
  const columns: ColumnDef<Deal>[] = [
    {
      key: 'product',
      headerKey: 'adminDealProduct',
      render: (row, l) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {l === 'ar' ? row.product.nameAr : row.product.nameEn}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {row.product.weight} {row.product.unit}
          </p>
        </div>
      ),
    },
    {
      key: 'dealPrice',
      headerKey: 'adminDealPrice',
      render: (row) => <MoneyCell value={row.dealPrice} lang={lang} />,
    },
    {
      key: 'originalPrice',
      headerKey: 'adminOriginalPrice',
      render: (row) => (
        <span className="text-sm text-muted-foreground line-through">
          {formatPriceWithCurrency(row.originalPrice, lang)}
        </span>
      ),
    },
    {
      key: 'discount',
      headerKey: 'adminDiscount',
      render: (row) => (
        <span className="text-sm font-semibold text-emerald-600">
          {row.discountPercent}% {t(lang, 'off')}
        </span>
      ),
    },
    {
      key: 'endDate',
      headerKey: 'adminEndsAt',
      className: 'w-24',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.endsAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'claimed',
      headerKey: 'adminClaimed',
      className: 'w-24',
      render: (row) => (
        <div className="text-sm">
          <span className="font-medium">{row.claimedCount}</span>
          <span className="text-muted-foreground"> / {row.maxQuantity}</span>
        </div>
      ),
    },
    {
      key: 'status',
      headerKey: 'adminStatus',
      className: 'w-20',
      render: (row) => (
        row.isActive ? (
          <StatusBadge status="timer_active" lang={lang} />
        ) : (
          <StatusBadge status="timer_expired" lang={lang} />
        )
      ),
    },
    {
      key: 'actions',
      headerKey: '',
      className: 'w-12',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Pencil className="size-4 me-2" />
              {t(lang, 'adminEditItem')}
            </DropdownMenuItem>
            {row.isActive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-amber-600" onSelect={(e) => e.preventDefault()}>
                    <Square className="size-4 me-2" />
                    {t(lang, 'adminEndDeal')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t(lang, 'adminEndDeal')}</AlertDialogTitle>
                    <AlertDialogDescription>{t(lang, 'adminEndDealConfirm')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t(lang, 'cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => endDealMutation.mutate({ id: row.id })}>
                      {t(lang, 'adminEndDeal')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                  <Trash2 className="size-4 me-2" />
                  {t(lang, 'adminDeleteItem')}
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t(lang, 'adminConfirmDelete')}</AlertDialogTitle>
                  <AlertDialogDescription>{t(lang, 'adminDeleteWarning')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t(lang, 'cancel')}</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteMutation.mutate(row.id)}>
                    {t(lang, 'adminDeleteItem')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminDeals')}</h2>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <Button size="sm" className="gap-1.5" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            {t(lang, 'adminCreateDeal')}
          </Button>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DealFormContent
              lang={lang}
              form={form}
              setForm={setForm}
              products={products}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              isSaving={createMutation.isPending}
              onSave={handleSave}
              onCancel={() => { setIsCreateOpen(false); resetForm(); }}
              title={t(lang, 'adminCreateDeal')}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDeal !== null} onOpenChange={(open) => { if (!open) setEditDeal(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DealFormContent
            lang={lang}
            form={form}
            setForm={setForm}
            products={products}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            isSaving={updateMutation.isPending}
            onSave={handleSave}
            onCancel={() => setEditDeal(null)}
            title={t(lang, 'adminEditDeal')}
          />
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as DealTab); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="all">{t(lang, 'adminFilterAll')}</TabsTrigger>
          <TabsTrigger value="active">{t(lang, 'adminFilterActive')}</TabsTrigger>
          <TabsTrigger value="expired">{t(lang, 'adminTimerExpired')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={deals}
        pagination={pagination}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error instanceof Error ? error.message : null}
        onRetry={() => refetch()}
        emptyMessageKey="adminNoItems"
        emptyAction={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4 me-1.5" />
            {t(lang, 'adminAddFirst')}
          </Button>
        }
      />
    </div>
  );
}

// ============================================
// DEAL FORM CONTENT — Searchable Product Picker
// ============================================

interface DealFormContentProps {
  lang: Lang;
  form: {
    productId: string;
    dealPrice: number;
    originalPrice: number;
    discountPercent: number;
    startsAt: string;
    endsAt: string;
    maxQuantity: number;
    isActive: boolean;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    productId: string;
    dealPrice: number;
    originalPrice: number;
    discountPercent: number;
    startsAt: string;
    endsAt: string;
    maxQuantity: number;
    isActive: boolean;
  }>>;
  products: Product[];
  productSearch: string;
  setProductSearch: (search: string) => void;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function DealFormContent({ lang, form, setForm, products, productSearch, setProductSearch, isSaving, onSave, onCancel, title }: DealFormContentProps) {
  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Auto-calculate discount when prices change
  const autoDiscount = useMemo(() => {
    if (form.dealPrice > 0 && form.originalPrice > 0) {
      return calcDiscountPercent(toPiastres(form.dealPrice), toPiastres(form.originalPrice));
    }
    return 0;
  }, [form.dealPrice, form.originalPrice]);

  // Selected product info
  const selectedProduct = products.find((p) => p.id === form.productId);

  // Filtered products for picker
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products.filter((p) =>
      p.nameEn.toLowerCase().includes(q) ||
      p.nameAr.includes(q) ||
      p.brandEn.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, productSearch]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        {/* Product Picker */}
        <div className="space-y-2 sm:col-span-2">
          <Label>{t(lang, 'adminDealProduct')}</Label>
          {form.productId && selectedProduct ? (
            <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
              <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs font-bold">{selectedProduct.icon || selectedProduct.nameEn.charAt(0)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {lang === 'ar' ? selectedProduct.nameAr : selectedProduct.nameEn}
                </p>
                <p className="text-xs text-muted-foreground">{selectedProduct.weight} {selectedProduct.unit}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => updateField('productId', '')}>
                {t(lang, 'adminEditItem')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={t(lang, 'adminSearchPlaceholder')}
                  className="ps-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    {t(lang, 'adminNoResults')}
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      className="flex items-center gap-2 p-2 w-full hover:bg-muted/50 transition-colors cursor-pointer text-start"
                      onClick={() => {
                        updateField('productId', p.id);
                        updateField('originalPrice', p.todayPrice / 100);
                        setProductSearch('');
                      }}
                    >
                      <div className="size-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs">{p.icon || p.nameEn.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {lang === 'ar' ? p.nameAr : p.nameEn}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.weight} {p.unit} — {formatPriceWithCurrency(p.todayPrice, lang)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Deal Price */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminDealPrice')} (EGP)</Label>
          <Input
            type="number"
            value={form.dealPrice}
            onChange={(e) => updateField('dealPrice', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Original Price */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminOriginalPrice')} (EGP)</Label>
          <Input
            type="number"
            value={form.originalPrice}
            onChange={(e) => updateField('originalPrice', parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Auto-calculated discount */}
        {autoDiscount > 0 && (
          <div className="sm:col-span-2 flex items-center gap-2 px-2">
            <span className="text-xs text-muted-foreground">{t(lang, 'adminDiscount')}:</span>
            <span className="text-sm font-semibold text-emerald-600">{autoDiscount}% {t(lang, 'off')}</span>
          </div>
        )}

        {/* Start Date */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminStartsAt')}</Label>
          <Input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => updateField('startsAt', e.target.value)}
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminEndsAt')}</Label>
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => updateField('endsAt', e.target.value)}
          />
        </div>

        {/* Max Quantity */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminMaxQuantity')}</Label>
          <Input
            type="number"
            value={form.maxQuantity}
            onChange={(e) => updateField('maxQuantity', parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <Switch checked={form.isActive} onCheckedChange={(v) => updateField('isActive', v)} />
          <Label>{t(lang, 'adminActive')}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>{t(lang, 'cancel')}</Button>
        <Button disabled={isSaving} onClick={onSave}>
          {isSaving ? t(lang, 'loading') : t(lang, 'adminSaveChanges')}
        </Button>
      </DialogFooter>
    </>
  );
}

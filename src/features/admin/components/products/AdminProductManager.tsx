'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import {
  type Lang,
  type Piastres,
  type Product,
  type Category,
  toPiastres,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Separator } from '@/components/ui/separator';
import { useLangStore } from '@/stores/lang-store';
import StatusBadge from '../shared/StatusBadge';
import MoneyCell from '../shared/MoneyCell';
import AdminDataTable, { type ColumnDef, type PaginationInfo } from '../shared/AdminDataTable';

// ============================================
// PRODUCT FORM DATA
// ============================================

interface ProductFormData {
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  brandEn: string;
  brandAr: string;
  todayPrice: number;   // EGP value, converted to Piastres on save
  yesterdayPrice: number;
  wholesalePrice: number;
  stock: number;
  lowStockThreshold: number;
  weight: string;
  unit: string;
  maxPerOrder: number;
  minOrderQty: number;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
}

const emptyForm: ProductFormData = {
  nameEn: '',
  nameAr: '',
  descriptionEn: '',
  descriptionAr: '',
  brandEn: '',
  brandAr: '',
  todayPrice: 0,
  yesterdayPrice: 0,
  wholesalePrice: 0,
  stock: 0,
  lowStockThreshold: 5,
  weight: '',
  unit: '',
  maxPerOrder: 10,
  minOrderQty: 1,
  categoryId: '',
  isActive: true,
  isFeatured: false,
};

function productToForm(product: Product): ProductFormData {
  return {
    nameEn: product.nameEn,
    nameAr: product.nameAr,
    descriptionEn: product.descriptionEn,
    descriptionAr: product.descriptionAr,
    brandEn: product.brandEn,
    brandAr: product.brandAr,
    todayPrice: product.todayPrice / 100,
    yesterdayPrice: (product.yesterdayPrice || 0) / 100,
    wholesalePrice: (product.wholesalePrice || 0) / 100,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    weight: product.weight,
    unit: product.unit,
    maxPerOrder: product.maxPerOrder,
    minOrderQty: product.minOrderQty,
    categoryId: product.categoryId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  };
}

function formToCreatePayload(form: ProductFormData): Partial<Product> & { nameEn: string; nameAr: string; todayPrice: Piastres; categoryId: string } {
  return {
    nameEn: form.nameEn,
    nameAr: form.nameAr,
    descriptionEn: form.descriptionEn,
    descriptionAr: form.descriptionAr,
    brandEn: form.brandEn,
    brandAr: form.brandAr,
    todayPrice: toPiastres(form.todayPrice),
    yesterdayPrice: form.yesterdayPrice > 0 ? toPiastres(form.yesterdayPrice) : null,
    wholesalePrice: form.wholesalePrice > 0 ? toPiastres(form.wholesalePrice) : null,
    stock: form.stock,
    lowStockThreshold: form.lowStockThreshold,
    weight: form.weight,
    unit: form.unit,
    maxPerOrder: form.maxPerOrder,
    minOrderQty: form.minOrderQty,
    categoryId: form.categoryId,
    isActive: form.isActive,
    isFeatured: form.isFeatured,
  };
}

function formToUpdatePayload(form: ProductFormData): Partial<Product> {
  return {
    nameEn: form.nameEn,
    nameAr: form.nameAr,
    descriptionEn: form.descriptionEn,
    descriptionAr: form.descriptionAr,
    brandEn: form.brandEn,
    brandAr: form.brandAr,
    todayPrice: toPiastres(form.todayPrice),
    yesterdayPrice: form.yesterdayPrice > 0 ? toPiastres(form.yesterdayPrice) : null,
    wholesalePrice: form.wholesalePrice > 0 ? toPiastres(form.wholesalePrice) : null,
    stock: form.stock,
    lowStockThreshold: form.lowStockThreshold,
    weight: form.weight,
    unit: form.unit,
    maxPerOrder: form.maxPerOrder,
    minOrderQty: form.minOrderQty,
    categoryId: form.categoryId,
    isActive: form.isActive,
    isFeatured: form.isFeatured,
  };
}

// ============================================
// PRODUCT MANAGER
// ============================================

interface AdminProductManagerProps {
  lang: Lang;
}

export default function AdminProductManager({ lang }: AdminProductManagerProps) {
  const { isRTL } = useLangStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);

  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch products
  const { data: productsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-products', page, search, statusFilter, categoryFilter],
    queryFn: () => adminApi.getProducts({
      page,
      limit: 10,
      search,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    }),
  });

  // Fetch categories for dropdown
  const { data: categoriesResponse } = useQuery({
    queryKey: ['admin-categories-dropdown'],
    queryFn: () => adminApi.getCategories(),
  });

  const categories: Category[] = categoriesResponse?.data || [];
  const products: Product[] = productsResponse?.data || [];
  const pagination: PaginationInfo | undefined = productsResponse?.pagination;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: Partial<Product> & { nameEn: string; nameAr: string; todayPrice: Piastres; categoryId: string }) =>
      adminApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsCreateOpen(false);
      setForm(emptyForm);
      setFormErrors({});
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      adminApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setEditProduct(null);
      setForm(emptyForm);
      setFormErrors({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteTarget(null);
    },
  });

  // Form handlers
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nameEn.trim()) errors.nameEn = t(lang, 'adminFieldRequired');
    if (!form.nameAr.trim()) errors.nameAr = t(lang, 'adminFieldRequired');
    if (!form.categoryId) errors.categoryId = t(lang, 'adminFieldRequired');
    if (form.todayPrice <= 0) errors.todayPrice = t(lang, 'adminFieldRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const openEdit = (product: Product) => {
    setForm(productToForm(product));
    setFormErrors({});
    setEditProduct(product);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (editProduct) {
      updateMutation.mutate({
        id: editProduct.id,
        data: formToUpdatePayload(form),
      });
    } else {
      createMutation.mutate(formToCreatePayload(form));
    }
  };

  const closeDialog = () => {
    if (editProduct) {
      setEditProduct(null);
    } else {
      setIsCreateOpen(false);
    }
    setForm(emptyForm);
    setFormErrors({});
  };

  // Column definitions
  const columns: ColumnDef<Product>[] = [
    {
      key: 'thumbnail',
      headerKey: '',
      className: 'w-12',
      render: (row) => (
        <div className="size-8 rounded-md bg-muted flex items-center justify-center overflow-hidden">
          {row.thumbnailUrl ? (
            <img src={row.thumbnailUrl} alt={row.nameEn} className="size-8 object-cover rounded-md" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">{row.icon || row.nameEn.charAt(0)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      headerKey: 'adminNameEn',
      render: (row, lng) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{lng === 'ar' ? row.nameAr : row.nameEn}</p>
          <p className="text-xs text-muted-foreground truncate">{lng === 'ar' ? row.nameEn : row.nameAr}</p>
        </div>
      ),
    },
    {
      key: 'price',
      headerKey: 'adminPrice',
      render: (row) => <MoneyCell value={row.todayPrice} lang={lang} />,
    },
    {
      key: 'stock',
      headerKey: 'adminStockQty',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{row.stock}</span>
          {row.stock <= row.lowStockThreshold && (
            <span className="text-xs text-amber-600">{t(lang, 'adminFilterLowStock')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      headerKey: 'adminStatus',
      render: (row) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} lang={lang} />,
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
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="size-4 me-2" />
              {t(lang, 'adminDeleteItem')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isDialogOpen = isCreateOpen || editProduct !== null;
  const dialogTitle = editProduct ? t(lang, 'adminEditProduct') : t(lang, 'adminCreateProduct');
  const isSaving = editProduct ? updateMutation.isPending : createMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">
          {t(lang, 'adminProducts')}
        </h2>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          {t(lang, 'adminCreateProduct')}
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <ProductFormContent
            lang={lang}
            form={form}
            setForm={setForm}
            categories={categories}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={closeDialog}
            title={dialogTitle}
            errors={formErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(lang, 'adminConfirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t(lang, 'adminDeleteWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(lang, 'cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
            >
              {t(lang, 'adminDeleteItem')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={products}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        error={error?.message || null}
        onRetry={() => refetch()}
        toolbar={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(lang, 'adminFilterAll')}</SelectItem>
                <SelectItem value="active">{t(lang, 'adminFilterActive')}</SelectItem>
                <SelectItem value="inactive">{t(lang, 'adminFilterInactive')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t(lang, 'adminFilterByCategory')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {lang === 'ar' ? cat.nameAr : cat.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        emptyMessageKey="adminNoItems"
        emptyAction={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 me-1.5" />
            {t(lang, 'adminAddFirst')}
          </Button>
        }
      />
    </div>
  );
}

// ============================================
// PRODUCT FORM CONTENT
// ============================================

interface ProductFormContentProps {
  lang: Lang;
  form: ProductFormData;
  setForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  categories: { id: string; nameEn: string; nameAr: string }[];
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  errors: Record<string, string>;
}

function ProductFormContent({
  lang,
  form,
  setForm,
  categories,
  isSaving,
  onSave,
  onCancel,
  errors,
}: ProductFormContentProps) {
  const updateField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (
    key: keyof ProductFormData,
    labelKey: string,
    children: React.ReactNode,
  ) => (
    <div className="space-y-2">
      <Label>{t(lang, labelKey)}</Label>
      {children}
      {errors[key] && (
        <p className="text-xs text-destructive">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        {/* Names */}
        {renderField('nameEn', 'adminNameEn',
          <Input value={form.nameEn} onChange={(e) => updateField('nameEn', e.target.value)} />
        )}
        {renderField('nameAr', 'adminNameAr',
          <Input value={form.nameAr} onChange={(e) => updateField('nameAr', e.target.value)} dir="rtl" />
        )}

        {/* Descriptions */}
        <div className="space-y-2 sm:col-span-2">
          <Label>{t(lang, 'adminDescriptionEn')}</Label>
          <Textarea value={form.descriptionEn} onChange={(e) => updateField('descriptionEn', e.target.value)} rows={2} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t(lang, 'adminDescriptionAr')}</Label>
          <Textarea value={form.descriptionAr} onChange={(e) => updateField('descriptionAr', e.target.value)} rows={2} dir="rtl" />
        </div>

        {/* Brands */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminBrandEn')}</Label>
          <Input value={form.brandEn} onChange={(e) => updateField('brandEn', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminBrandAr')}</Label>
          <Input value={form.brandAr} onChange={(e) => updateField('brandAr', e.target.value)} dir="rtl" />
        </div>

        <Separator className="sm:col-span-2" />

        {/* Prices */}
        {renderField('todayPrice', 'adminPrice',
          <Input type="number" value={form.todayPrice} onChange={(e) => updateField('todayPrice', parseFloat(e.target.value) || 0)} placeholder="EGP" />
        )}
        <div className="space-y-2">
          <Label>{t(lang, 'adminYesterdayPrice')} (EGP)</Label>
          <Input type="number" value={form.yesterdayPrice} onChange={(e) => updateField('yesterdayPrice', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminWholesalePrice')} (EGP)</Label>
          <Input type="number" value={form.wholesalePrice} onChange={(e) => updateField('wholesalePrice', parseFloat(e.target.value) || 0)} />
        </div>

        <Separator className="sm:col-span-2" />

        {/* Category */}
        {renderField('categoryId', 'adminCategory',
          <Select value={form.categoryId} onValueChange={(v) => updateField('categoryId', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Weight / Unit */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminWeight')}</Label>
          <Input value={form.weight} onChange={(e) => updateField('weight', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminUnit')}</Label>
          <Input value={form.unit} onChange={(e) => updateField('unit', e.target.value)} />
        </div>

        <Separator className="sm:col-span-2" />

        {/* Stock */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminStockQty')}</Label>
          <Input type="number" value={form.stock} onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminThreshold')}</Label>
          <Input type="number" value={form.lowStockThreshold} onChange={(e) => updateField('lowStockThreshold', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminMaxPerOrder')}</Label>
          <Input type="number" value={form.maxPerOrder} onChange={(e) => updateField('maxPerOrder', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminMinOrderQty')}</Label>
          <Input type="number" value={form.minOrderQty} onChange={(e) => updateField('minOrderQty', parseInt(e.target.value) || 0)} />
        </div>

        <Separator className="sm:col-span-2" />

        {/* Toggles */}
        <div className="flex items-center gap-3">
          <Switch checked={form.isActive} onCheckedChange={(v) => updateField('isActive', v)} />
          <Label>{t(lang, 'adminActive')}</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.isFeatured} onCheckedChange={(v) => updateField('isFeatured', v)} />
          <Label>{t(lang, 'adminFeatured')}</Label>
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

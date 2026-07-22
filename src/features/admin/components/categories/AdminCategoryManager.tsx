'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { type Lang, type Category } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
import AdminDataTable, { type ColumnDef, type PaginationInfo } from '../shared/AdminDataTable';

// ============================================
// CATEGORY MANAGER — Flat table view
// ============================================

interface AdminCategoryManagerProps {
  lang: Lang;
}

interface CategoryRow extends Category {
  parentNameEn: string;
  parentNameAr: string;
}

export default function AdminCategoryManager({ lang }: AdminCategoryManagerProps) {
  const { isRTL } = useLangStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch categories
  const { data: categoriesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });

  const categories = categoriesResponse?.data || [];

  // Build a map for parent lookups
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Enrich categories with parent names
  const categoryRows: CategoryRow[] = categories.map((c) => {
    const parent = c.parentId ? categoryMap.get(c.parentId) : null;
    return {
      ...c,
      parentNameEn: parent ? parent.nameEn : '',
      parentNameAr: parent ? parent.nameAr : '',
    };
  });

  // Filter by search
  const filteredRows = search
    ? categoryRows.filter((c) =>
        c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        c.nameAr.includes(search) ||
        c.slug.toLowerCase().includes(search.toLowerCase())
      )
    : categoryRows;

  // Mutations
  const createMutation = useMutation({
    mutationFn: adminApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => adminApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  // Form state
  const [form, setForm] = useState({
    nameEn: '',
    nameAr: '',
    slug: '',
    descriptionEn: '',
    descriptionAr: '',
    icon: '',
    color: '',
    sortOrder: 0,
    isActive: true,
    parentId: '',
  });

  const resetForm = () => {
    setForm({
      nameEn: '', nameAr: '', slug: '', descriptionEn: '', descriptionAr: '',
      icon: '', color: '', sortOrder: 0, isActive: true, parentId: '',
    });
  };

  const openEdit = (cat: Category) => {
    setForm({
      nameEn: cat.nameEn, nameAr: cat.nameAr, slug: cat.slug,
      descriptionEn: cat.descriptionEn, descriptionAr: cat.descriptionAr,
      icon: cat.icon, color: cat.color, sortOrder: cat.sortOrder,
      isActive: cat.isActive, parentId: cat.parentId || '',
    });
    setEditCategory(cat);
  };

  const handleSave = () => {
    if (editCategory) {
      updateMutation.mutate({
        id: editCategory.id,
        data: { ...form, parentId: form.parentId || null } as Partial<Category>,
      });
    } else {
      createMutation.mutate(form as Partial<Category> & { nameEn: string; nameAr: string; slug: string });
    }
  };

  // Column definitions
  const columns: ColumnDef<CategoryRow>[] = [
    {
      key: 'icon',
      headerKey: '',
      className: 'w-12',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.icon ? (
            <span className="text-lg shrink-0">{row.icon}</span>
          ) : (
            <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-muted-foreground">{row.nameEn.charAt(0)}</span>
            </div>
          )}
          {row.color && (
            <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      headerKey: 'adminNameEn',
      render: (row, l) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{l === 'ar' ? row.nameAr : row.nameEn}</p>
          <p className="text-xs text-muted-foreground truncate">{l === 'ar' ? row.nameEn : row.nameAr}</p>
        </div>
      ),
    },
    {
      key: 'productCount',
      headerKey: 'adminProductCount',
      className: 'w-20',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.productCount ?? 0}
        </span>
      ),
    },
    {
      key: 'parent',
      headerKey: 'adminParentCategory',
      className: 'w-28',
      render: (row, l) => (
        row.parentId ? (
          <span className="text-sm text-foreground truncate">
            {l === 'ar' ? row.parentNameAr : row.parentNameEn}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      ),
    },
    {
      key: 'status',
      headerKey: 'adminStatus',
      className: 'w-20',
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
                  <AlertDialogDescription>
                    {row.productCount !== undefined && row.productCount > 0
                      ? t(lang, 'adminDeleteCategoryWarning') + ` (${row.productCount} products)`
                      : t(lang, 'adminDeleteWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t(lang, 'cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => deleteMutation.mutate(row.id)}
                  >
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
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminCategories')}</h2>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <Button size="sm" className="gap-1.5" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            {t(lang, 'adminCreateCategory')}
          </Button>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <CategoryFormContent
              lang={lang}
              form={form}
              setForm={setForm}
              categories={categories}
              excludeId={null}
              isSaving={createMutation.isPending}
              onSave={handleSave}
              onCancel={() => { setIsCreateOpen(false); resetForm(); }}
              title={t(lang, 'adminCreateCategory')}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editCategory !== null} onOpenChange={(open) => { if (!open) setEditCategory(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <CategoryFormContent
            lang={lang}
            form={form}
            setForm={setForm}
            categories={categories}
            excludeId={editCategory?.id}
            isSaving={updateMutation.isPending}
            onSave={handleSave}
            onCancel={() => setEditCategory(null)}
            title={t(lang, 'adminEditCategory')}
          />
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={filteredRows}
        isLoading={isLoading}
        error={error instanceof Error ? error.message : null}
        onRetry={() => refetch()}
        onSearch={setSearch}
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
// CATEGORY FORM CONTENT
// ============================================

interface CategoryFormContentProps {
  lang: Lang;
  form: typeof AdminCategoryManager extends () => unknown ? never : never;
  setForm: React.Dispatch<React.SetStateAction<{
    nameEn: string;
    nameAr: string;
    slug: string;
    descriptionEn: string;
    descriptionAr: string;
    icon: string;
    color: string;
    sortOrder: number;
    isActive: boolean;
    parentId: string;
  }>>;
  categories: Category[];
  excludeId: string | null;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  title: string;
}

function CategoryFormContent({ lang, form, setForm, categories, excludeId, isSaving, onSave, onCancel, title }: CategoryFormContentProps) {
  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Filter out the current category from parent dropdown
  const parentOptions = excludeId ? categories.filter((c) => c.id !== excludeId) : categories;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        {/* Names */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminNameEn')}</Label>
          <Input value={form.nameEn} onChange={(e) => updateField('nameEn', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminNameAr')}</Label>
          <Input value={form.nameAr} onChange={(e) => updateField('nameAr', e.target.value)} dir="rtl" />
        </div>

        {/* Slug */}
        <div className="space-y-2 sm:col-span-2">
          <Label>{t(lang, 'adminSlug')}</Label>
          <Input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} />
        </div>

        {/* Descriptions */}
        <div className="space-y-2 sm:col-span-2">
          <Label>{t(lang, 'adminDescriptionEn')}</Label>
          <Textarea value={form.descriptionEn} onChange={(e) => updateField('descriptionEn', e.target.value)} rows={2} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t(lang, 'adminDescriptionAr')}</Label>
          <Textarea value={form.descriptionAr} onChange={(e) => updateField('descriptionAr', e.target.value)} rows={2} dir="rtl" />
        </div>

        <Separator className="sm:col-span-2" />

        {/* Icon */}
        <div className="space-y-2">
          <Label>Icon</Label>
          <Input value={form.icon} onChange={(e) => updateField('icon', e.target.value)} placeholder="e.g. 🍚 or emoji" />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex items-center gap-2">
            <Input value={form.color} onChange={(e) => updateField('color', e.target.value)} placeholder="#hex or CSS color" className="flex-1" />
            {form.color && (
              <div className="size-8 rounded-md border border-border shrink-0" style={{ backgroundColor: form.color }} />
            )}
          </div>
        </div>

        <Separator className="sm:col-span-2" />

        {/* Parent Category */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminParentCategory')}</Label>
          <Select value={form.parentId || '__none__'} onValueChange={(v) => updateField('parentId', v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t(lang, 'adminNoParent')}</SelectItem>
              {parentOptions.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="space-y-2">
          <Label>{t(lang, 'adminSortOrder')}</Label>
          <Input type="number" value={form.sortOrder} onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)} />
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

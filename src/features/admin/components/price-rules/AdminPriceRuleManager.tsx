'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { type Lang, type PriceRule, type Piastres, toPiastres, formatPriceWithCurrency } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
// PRICE RULE MANAGER
// ============================================

interface AdminPriceRuleManagerProps {
  lang: Lang;
}

export default function AdminPriceRuleManager({ lang }: AdminPriceRuleManagerProps) {
  const { isRTL } = useLangStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [editRule, setEditRule] = useState<PriceRule | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch price rules
  const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active';
  const { data: rulesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-price-rules', page, isActive],
    queryFn: () => adminApi.getPriceRules({ page, limit: 10, isActive }),
  });

  // Fetch categories for scope selectors
  const { data: categoriesResponse } = useQuery({
    queryKey: ['admin-categories-dropdown-pr'],
    queryFn: () => adminApi.getCategories(),
  });

  const categories = categoriesResponse?.data || [];
  const rules = rulesResponse?.data || [];
  const pagination: PaginationInfo | undefined = rulesResponse?.pagination;

  // Mutations
  const createMutation = useMutation({
    mutationFn: adminApi.createPriceRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-price-rules'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PriceRule> }) => adminApi.updatePriceRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-price-rules'] });
      setEditRule(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deletePriceRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-price-rules'] });
    },
  });

  // Form state
  const [form, setForm] = useState({
    nameEn: '',
    nameAr: '',
    type: 'percentage',
    value: 0,
    minQuantity: 0,
    maxQuantity: null as number | null,
    minOrderTotal: 0,
    customerGroup: 'retail',
    categoryId: '',
    productId: '',
    zoneId: '',
    priority: 10,
    startsAt: '',
    endsAt: '',
    isActive: true,
  });

  const resetForm = () => {
    setForm({
      nameEn: '', nameAr: '', type: 'percentage', value: 0,
      minQuantity: 0, maxQuantity: null, minOrderTotal: 0,
      customerGroup: 'retail', categoryId: '', productId: '',
      zoneId: '', priority: 10, startsAt: '', endsAt: '', isActive: true,
    });
  };

  const openEdit = (rule: PriceRule) => {
    setForm({
      nameEn: rule.nameEn, nameAr: rule.nameAr,
      type: rule.type, value: rule.value,
      minQuantity: rule.minQuantity, maxQuantity: rule.maxQuantity,
      minOrderTotal: rule.minOrderTotal / 100,
      customerGroup: rule.customerGroup,
      categoryId: rule.categoryId || '',
      productId: rule.productId || '',
      zoneId: rule.zoneId || '',
      priority: rule.priority,
      startsAt: rule.startsAt || '',
      endsAt: rule.endsAt || '',
      isActive: rule.isActive,
    });
    setEditRule(rule);
  };

  const handleSave = () => {
    if (editRule) {
      updateMutation.mutate({
        id: editRule.id,
        data: {
          ...form,
          minOrderTotal: toPiastres(form.minOrderTotal),
          categoryId: form.categoryId || null,
          productId: form.productId || null,
          zoneId: form.zoneId || null,
          maxQuantity: form.maxQuantity,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
        } as Partial<PriceRule>,
      });
    } else {
      createMutation.mutate({
        ...form,
        minOrderTotal: toPiastres(form.minOrderTotal) as Piastres,
        categoryId: form.categoryId || null,
        productId: form.productId || null,
        zoneId: form.zoneId || null,
        maxQuantity: form.maxQuantity,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      } as Partial<PriceRule> & { nameEn: string; nameAr: string; type: string; value: number });
    }
  };

  // Get scope label
  const getScopeLabel = (rule: PriceRule) => {
    if (rule.customerGroup) return t(lang, 'adminRuleCustomerGroup');
    if (rule.categoryId) return t(lang, 'adminCategory');
    if (rule.productId) return t(lang, 'adminDealProduct');
    if (rule.zoneId) return t(lang, 'adminDelivery');
    return t(lang, 'adminFilterAll');
  };

  // Column definitions
  const columns: ColumnDef<PriceRule>[] = [
    {
      key: 'name',
      headerKey: 'adminNameEn',
      render: (row, lang) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {lang === 'ar' ? row.nameAr : row.nameEn}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {lang === 'ar' ? row.nameEn : row.nameAr}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      headerKey: 'adminRuleType',
      render: (row) => (
        <span className="text-sm">
          {row.type === 'percentage' ? t(lang, 'adminPercentage') : t(lang, 'adminFixed')}
        </span>
      ),
    },
    {
      key: 'value',
      headerKey: 'adminRuleValue',
      render: (row) => (
        <span className="text-sm font-semibold text-foreground">
          {row.type === 'percentage' ? `${row.value}%` : formatPriceWithCurrency(row.value as Piastres, lang)}
        </span>
      ),
    },
    {
      key: 'scope',
      headerKey: 'adminRuleScope',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{getScopeLabel(row)}</span>
      ),
    },
    {
      key: 'priority',
      headerKey: 'adminRulePriority',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.priority}</span>
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
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminPriceRules')}</h2>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <PriceRuleFormContent
              lang={lang}
              form={form}
              setForm={setForm}
              categories={categories}
              isSaving={createMutation.isPending}
              onSave={handleSave}
              title={t(lang, 'adminCreatePriceRule')}
            />
          </DialogContent>
          <Button size="sm" className="gap-1.5" onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            {t(lang, 'adminCreatePriceRule')}
          </Button>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editRule !== null} onOpenChange={(open) => { if (!open) setEditRule(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <PriceRuleFormContent
            lang={lang}
            form={form}
            setForm={setForm}
            categories={categories}
            isSaving={updateMutation.isPending}
            onSave={handleSave}
            title={t(lang, 'adminEditPriceRule')}
          />
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <AdminDataTable
        columns={columns}
        data={rules}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        toolbar={
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t(lang, 'adminFilterAll')}</SelectItem>
              <SelectItem value="active">{t(lang, 'adminFilterActive')}</SelectItem>
              <SelectItem value="inactive">{t(lang, 'adminFilterInactive')}</SelectItem>
            </SelectContent>
          </Select>
        }
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
// PRICE RULE FORM CONTENT
// ============================================

interface PriceRuleFormContentProps {
  lang: Lang;
  form: Record<string, unknown>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  categories: { id: string; nameEn: string; nameAr: string }[];
  isSaving: boolean;
  onSave: () => void;
  title: string;
}

function PriceRuleFormContent({ lang, form, setForm, categories, isSaving, onSave, title }: PriceRuleFormContentProps) {
  const f = form as Record<string, unknown>;
  const updateField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label>{t(lang, 'adminNameEn')}</Label>
          <Input value={f.nameEn as string} onChange={(e) => updateField('nameEn', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminNameAr')}</Label>
          <Input value={f.nameAr as string} onChange={(e) => updateField('nameAr', e.target.value)} dir="rtl" />
        </div>

        <div className="space-y-2">
          <Label>{t(lang, 'adminRuleType')}</Label>
          <Select value={f.type as string} onValueChange={(v) => updateField('type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t(lang, 'adminPercentage')}</SelectItem>
              <SelectItem value="fixed">{t(lang, 'adminFixed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t(lang, 'adminRuleValue')}</Label>
          <Input type="number" value={f.value as number} onChange={(e) => updateField('value', parseFloat(e.target.value) || 0)} />
        </div>

        <div className="space-y-2">
          <Label>{t(lang, 'adminRuleCustomerGroup')}</Label>
          <Select value={f.customerGroup as string} onValueChange={(v) => updateField('customerGroup', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="retail">{t(lang, 'adminRetail')}</SelectItem>
              <SelectItem value="wholesale">{t(lang, 'adminWholesale')}</SelectItem>
              <SelectItem value="vip">{t(lang, 'adminVIP')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t(lang, 'adminCategory')}</Label>
          <Select value={(f.categoryId as string) || '__none__'} onValueChange={(v) => updateField('categoryId', v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t(lang, 'adminFilterAll')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t(lang, 'adminRuleMinQuantity')}</Label>
          <Input type="number" value={f.minQuantity as number} onChange={(e) => updateField('minQuantity', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminRuleMaxQuantity')}</Label>
          <Input type="number" value={f.maxQuantity as number | null ?? ''} onChange={(e) => updateField('maxQuantity', e.target.value ? parseInt(e.target.value) : null)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminRuleMinOrderTotal')} (EGP)</Label>
          <Input type="number" value={f.minOrderTotal as number} onChange={(e) => updateField('minOrderTotal', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminRulePriority')}</Label>
          <Input type="number" value={f.priority as number} onChange={(e) => updateField('priority', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminStartsAt')}</Label>
          <Input type="datetime-local" value={f.startsAt as string} onChange={(e) => updateField('startsAt', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t(lang, 'adminEndsAt')}</Label>
          <Input type="datetime-local" value={f.endsAt as string} onChange={(e) => updateField('endsAt', e.target.value)} />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={f.isActive as boolean} onCheckedChange={(v) => updateField('isActive', v)} />
          <Label>{t(lang, 'adminActive')}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">{t(lang, 'cancel')}</Button>
        <Button disabled={isSaving} onClick={onSave}>
          {isSaving ? t(lang, 'loading') : t(lang, 'adminSaveChanges')}
        </Button>
      </DialogFooter>
    </>
  );
}

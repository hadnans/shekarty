'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Store, Truck, CreditCard } from 'lucide-react';
import { type Lang, toPiastres } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { adminApi } from '@/services/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ============================================
// ADMIN SETTINGS
// ============================================

interface AdminSettingsProps {
  lang: Lang;
}

export default function AdminSettings({ lang }: AdminSettingsProps) {
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  });

  const settings = settingsResponse?.data;

  // Form state
  const [form, setForm] = useState({
    storeNameEn: '',
    storeNameAr: '',
    storePhone: '',
    storeEmail: '',
    freeDeliveryThreshold: 0,
    standardDeliveryFee: 0,
    defaultLang: 'en',
  });

  // Populate form when settings load
  const [isInitialized, setIsInitialized] = useState(false);
  if (settings && !isInitialized) {
    setForm({
      storeNameEn: settings.storeNameEn,
      storeNameAr: settings.storeNameAr,
      storePhone: settings.storePhone,
      storeEmail: settings.storeEmail,
      freeDeliveryThreshold: settings.freeDeliveryThreshold / 100,
      standardDeliveryFee: settings.standardDeliveryFee / 100,
      defaultLang: settings.defaultLang,
    });
    setIsInitialized(true);
  }

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.updateSettings(data as Partial<import('@/types/ggh').AdminSettings>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      storeNameEn: form.storeNameEn,
      storeNameAr: form.storeNameAr,
      storePhone: form.storePhone,
      storeEmail: form.storeEmail,
      freeDeliveryThreshold: toPiastres(form.freeDeliveryThreshold),
      standardDeliveryFee: toPiastres(form.standardDeliveryFee),
      defaultLang: form.defaultLang,
    });
  };

  const updateField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminSettings')}</h2>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">{t(lang, 'adminSettings')}</h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Save className="size-4" />
          {updateMutation.isPending ? t(lang, 'loading') : t(lang, 'adminSaveChanges')}
        </Button>
      </div>

      {/* Success notification */}
      {updateMutation.isSuccess && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
          <span className="text-sm text-emerald-600 font-medium">{t(lang, 'adminSettingsSaved')}</span>
        </div>
      )}

      {/* Error notification */}
      {updateMutation.isError && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
          <span className="text-sm text-red-600 font-medium">{updateMutation.error?.message || t(lang, 'error')}</span>
        </div>
      )}

      {/* Store Info Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Store className="size-4" />
            {t(lang, 'adminStoreInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t(lang, 'adminStoreName')} (EN)</Label>
              <Input
                value={form.storeNameEn}
                onChange={(e) => updateField('storeNameEn', e.target.value)}
                placeholder="GGH Store"
              />
            </div>
            <div className="space-y-2">
              <Label>{t(lang, 'adminStoreName')} (AR)</Label>
              <Input
                value={form.storeNameAr}
                onChange={(e) => updateField('storeNameAr', e.target.value)}
                placeholder="متجر جملة"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t(lang, 'adminPhone')}</Label>
              <Input
                value={form.storePhone}
                onChange={(e) => updateField('storePhone', e.target.value)}
                placeholder="+20 100 000 0000"
              />
            </div>
            <div className="space-y-2">
              <Label>{t(lang, 'adminEmail')}</Label>
              <Input
                value={form.storeEmail}
                onChange={(e) => updateField('storeEmail', e.target.value)}
                placeholder="store@ggh.com"
                type="email"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Config Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Truck className="size-4" />
            {t(lang, 'adminDeliveryConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t(lang, 'adminFreeDeliveryThreshold')} (EGP)</Label>
              <Input
                type="number"
                value={form.freeDeliveryThreshold}
                onChange={(e) => updateField('freeDeliveryThreshold', parseFloat(e.target.value) || 0)}
                placeholder="200"
              />
              <p className="text-xs text-muted-foreground">
                {lang === 'ar'
                  ? `توصيل مجاني للطلبات فوق ${form.freeDeliveryThreshold} ج.م`
                  : `Free delivery for orders above EGP ${form.freeDeliveryThreshold}`}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t(lang, 'adminStandardDeliveryFee')} (EGP)</Label>
              <Input
                type="number"
                value={form.standardDeliveryFee}
                onChange={(e) => updateField('standardDeliveryFee', parseFloat(e.target.value) || 0)}
                placeholder="25"
              />
              <p className="text-xs text-muted-foreground">
                {lang === 'ar'
                  ? `رسوم التوصيل الافتراضية: ${form.standardDeliveryFee} ج.م`
                  : `Standard delivery fee: EGP ${form.standardDeliveryFee}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Language Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="size-4" />
            {t(lang, 'adminPaymentConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t(lang, 'adminDefaultLang')}</Label>
              <Select value={form.defaultLang} onValueChange={(v) => updateField('defaultLang', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(lang, 'adminDefaultLang')}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t(lang, 'adminCashOnDelivery')}</Label>
              <div className="flex items-center gap-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'مفعّل بالفعل' : 'Already enabled'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { User, Package, Truck, Warehouse, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Lang, type CustomerProfile } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';

interface AccountViewProps {
  lang: Lang;
  customer: CustomerProfile | null;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
}

export default function AccountView({ lang, customer, onLogout, onNavigate }: AccountViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="size-6" style={{ color: 'var(--ggh-primary)' }} />
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'account')}
        </h2>
      </div>

      {/* Profile Card */}
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{ backgroundColor: 'var(--ggh-card)', border: '1px solid var(--ggh-border)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="size-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: 'var(--ggh-primary)' }}
          >
            {customer?.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
              {customer?.nameAr && lang === 'ar'
                ? customer.nameAr
                : `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || t(lang, 'account')}
            </h3>
            <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
              {customer?.phone}
            </p>
            {customer?.wholesaleStatus && customer.wholesaleStatus !== 'retail' && (
              <Badge className="mt-1" style={{ backgroundColor: '#E8F5E9', color: 'var(--ggh-primary)' }}>
                {customer.wholesaleStatus === 'wholesale'
                  ? lang === 'ar' ? 'جملة' : 'Wholesale'
                  : customer.wholesaleStatus === 'vip'
                  ? lang === 'ar' ? 'VIP' : 'VIP'
                  : customer.wholesaleStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Account Menu */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start h-14 text-base rounded-xl"
          style={{ color: 'var(--ggh-text)' }}
          onClick={() => onNavigate?.('orders')}
        >
          <Package className="size-5 me-3" style={{ color: 'var(--ggh-primary)' }} />
          {t(lang, 'orders')}
        </Button>

        {/* Admin links */}
        <div
          className="pt-2 mt-2"
          style={{ borderTop: '1px solid var(--ggh-border)' }}
        >
          <p className="text-xs font-semibold mb-2 px-4" style={{ color: 'var(--ggh-text-secondary)' }}>
            {lang === 'ar' ? 'أدوات الإدارة' : 'Admin Tools'}
          </p>
          <Button
            variant="ghost"
            className="w-full justify-start h-14 text-base rounded-xl"
            style={{ color: 'var(--ggh-text)' }}
            onClick={() => onNavigate?.('admin')}
          >
            <Shield className="size-5 me-3" style={{ color: '#7C3AED' }} />
            {lang === 'ar' ? 'بوابة الإدارة' : 'Admin Portal'}
          </Button>
        </div>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-14 text-base font-medium rounded-xl"
        style={{ borderColor: 'var(--ggh-border)', color: '#CF222E' }}
        onClick={onLogout}
      >
        {t(lang, 'logout')}
      </Button>
    </div>
  );
}

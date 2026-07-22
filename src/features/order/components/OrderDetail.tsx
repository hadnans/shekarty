'use client';

import { ArrowLeft, ArrowRight, RotateCcw, XCircle, MapPin, Truck, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  type Order,
  type Lang,
  type Piastres,
  type PaymentMethod,
  formatPriceWithCurrency,
  multiplyPiastres,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import OrderTimeline from './OrderTimeline';

interface OrderDetailProps {
  order: Order;
  onBack?: () => void;
  onReorder?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  lang?: Lang;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: '#9A6700' },
  confirmed: { bg: '#E3F2FD', text: '#1565C0' },
  processing: { bg: '#E8F5E9', text: '#1B6820' },
  packed: { bg: '#E8F5E9', text: '#1B6820' },
  out_for_delivery: { bg: '#E3F2FD', text: '#1565C0' },
  delivered: { bg: '#E8F5E9', text: '#1A7F37' },
  cancelled: { bg: '#FFEBEE', text: '#CF222E' },
  returned: { bg: '#FFEBEE', text: '#CF222E' },
};

const paymentLabels: Record<PaymentMethod, string> = {
  cod: 'cashOnDelivery',
  card: 'cardPayment',
  wallet: 'walletPayment',
};

export default function OrderDetail({ order, onBack, onReorder, onCancel, lang: langProp }: OrderDetailProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;

  const statusStyle = statusColors[order.status] || statusColors.pending;
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            className="h-12 w-12 shrink-0"
            onClick={onBack}
            aria-label={t(lang, 'back')}
          >
            <BackArrow className="size-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'orderDetails')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
            #{order.orderNumber}
          </p>
        </div>
        <Badge
          className="text-sm font-semibold px-3 py-1 border-0"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
        >
          {t(lang, order.status)}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#FAFAFA', border: '1px solid var(--ggh-border)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'orderStatus')}
        </h3>
        <OrderTimeline
          currentStatus={order.status}
          statusHistory={order.statusHistory}
          lang={lang}
        />
      </div>

      {/* Order items */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'items')}
        </h3>
        {order.items.map((item) => {
          const name = lang === 'ar' ? item.productNameAr : item.productNameEn;
          const brand = lang === 'ar' ? item.brandAr : item.brandEn;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: '#FAFAFA', border: '1px solid var(--ggh-border)' }}
            >
              <span className="text-2xl" aria-hidden="true">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--ggh-text)' }}>
                  {name}
                </p>
                <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                  {brand} · {item.weight} · {t(lang, 'quantity')}: {item.quantity}
                </p>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--ggh-text)' }}>
                {formatPriceWithCurrency(item.totalPrice, lang)}
              </span>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Delivery info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-4" style={{ color: 'var(--ggh-primary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'deliveryAddress')}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
          {order.deliveryAddressSnapshot}
        </p>

        {order.deliverySlot && (
          <div className="flex items-center gap-2">
            <Truck className="size-4" style={{ color: 'var(--ggh-primary)' }} />
            <span className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
              {order.deliverySlot}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <CreditCard className="size-4" style={{ color: 'var(--ggh-primary)' }} />
          <span className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, paymentLabels[order.paymentMethod])}
          </span>
        </div>
      </div>

      <Separator />

      {/* Price breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--ggh-text-secondary)' }}>{t(lang, 'subtotal')}</span>
          <span className="font-semibold" style={{ color: 'var(--ggh-text)' }}>
            {formatPriceWithCurrency(order.subtotal, lang)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--ggh-text-secondary)' }}>{t(lang, 'deliveryFee')}</span>
          <span className="font-semibold" style={{ color: order.deliveryFee === 0 ? 'var(--ggh-primary)' : 'var(--ggh-text)' }}>
            {order.deliveryFee === 0 ? t(lang, 'free') : formatPriceWithCurrency(order.deliveryFee, lang)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg">
          <span className="font-semibold" style={{ color: 'var(--ggh-text)' }}>{t(lang, 'total')}</span>
          <span className="font-bold" style={{ color: 'var(--ggh-primary)' }}>
            {formatPriceWithCurrency(order.totalAmount, lang)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {onReorder && (
          <Button
            className="flex-1 h-14 text-base font-bold rounded-xl"
            style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
            onClick={() => onReorder(order.id)}
          >
            <RotateCcw className="size-5 me-2" />
            {t(lang, 'reorder')}
          </Button>
        )}
        {canCancel && onCancel && (
          <Button
            variant="outline"
            className="h-14 px-6 text-base font-medium rounded-xl"
            style={{ borderColor: '#CF222E', color: '#CF222E' }}
            onClick={() => onCancel(order.id)}
          >
            <XCircle className="size-5 me-2" />
            {t(lang, 'cancelOrder')}
          </Button>
        )}
      </div>
    </div>
  );
}

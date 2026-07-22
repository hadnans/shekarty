'use client';

import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  type Lang,
  type Piastres,
  type Address,
  type PaymentMethod,
  formatPriceWithCurrency,
  multiplyPiastres,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { useCartStore } from '@/stores/cart-store';

interface OrderSummaryProps {
  address?: Address;
  deliverySlotLabel?: string;
  paymentMethod: PaymentMethod;
  onPlaceOrder: () => void;
  isPlacing?: boolean;
  lang?: Lang;
}

export default function OrderSummary({
  address,
  deliverySlotLabel,
  paymentMethod,
  onPlaceOrder,
  isPlacing = false,
  lang: langProp,
}: OrderSummaryProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const { items, getSubtotal, getDeliveryFee, getTotal } = useCartStore();

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  const paymentLabel =
    paymentMethod === 'cod'
      ? t(lang, 'cashOnDelivery')
      : paymentMethod === 'card'
      ? t(lang, 'cardPayment')
      : t(lang, 'walletPayment');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
        {t(lang, 'checkout')}
      </h3>

      {/* Items list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((item) => {
          const name = lang === 'ar' ? item.nameAr : item.nameEn;
          const lineTotal = multiplyPiastres(item.price, item.quantity);
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span className="text-lg" aria-hidden="true">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--ggh-text)' }}>
                  {name}
                </p>
                <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                  {t(lang, 'quantity')}: {item.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--ggh-text)' }}>
                {formatPriceWithCurrency(lineTotal, lang)}
              </span>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Address summary */}
      {address && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, 'deliveryAddress')}
          </p>
          <p className="text-sm" style={{ color: 'var(--ggh-text)' }}>
            {address.addressLine1}
            {address.buildingNo ? `, ${address.buildingNo}` : ''}
          </p>
          <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
            {address.area}, {address.city}
          </p>
        </div>
      )}

      {/* Delivery slot summary */}
      {deliverySlotLabel && (
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, 'deliverySlot')}
          </p>
          <p className="text-sm" style={{ color: 'var(--ggh-text)' }}>
            {deliverySlotLabel}
          </p>
        </div>
      )}

      {/* Payment method summary */}
      <div className="p-3 rounded-lg" style={{ backgroundColor: '#FAFAFA' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ggh-text-secondary)' }}>
          {t(lang, 'paymentMethod')}
        </p>
        <p className="text-sm" style={{ color: 'var(--ggh-text)' }}>
          {paymentLabel}
        </p>
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--ggh-text-secondary)' }}>{t(lang, 'subtotal')}</span>
          <span className="font-semibold" style={{ color: 'var(--ggh-text)' }}>
            {formatPriceWithCurrency(subtotal, lang)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--ggh-text-secondary)' }}>{t(lang, 'deliveryFee')}</span>
          <span className="font-semibold" style={{ color: deliveryFee === 0 ? 'var(--ggh-primary)' : 'var(--ggh-text)' }}>
            {deliveryFee === 0 ? t(lang, 'free') : formatPriceWithCurrency(deliveryFee, lang)}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg">
          <span className="font-semibold" style={{ color: 'var(--ggh-text)' }}>{t(lang, 'total')}</span>
          <span className="font-bold" style={{ color: 'var(--ggh-primary)' }}>
            {formatPriceWithCurrency(total, lang)}
          </span>
        </div>
      </div>

      {/* Place order button */}
      <Button
        className="w-full h-14 text-lg font-bold rounded-xl"
        style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
        onClick={onPlaceOrder}
        disabled={isPlacing}
      >
        {isPlacing ? t(lang, 'loading') : t(lang, 'placeOrder')}
      </Button>
    </div>
  );
}

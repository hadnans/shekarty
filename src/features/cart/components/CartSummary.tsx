'use client';

import { type Piastres, formatPriceWithCurrency, toPiastres, fromPiastres } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { useCartStore } from '@/stores/cart-store';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { type Lang } from '@/types/ggh';

const FREE_DELIVERY_THRESHOLD = 50000 as Piastres; // EGP 500

interface CartSummaryProps {
  lang?: Lang;
}

export default function CartSummary({ lang: langProp }: CartSummaryProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const { getSubtotal, getDeliveryFee, getTotal, getItemCount } = useCartStore();

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();
  const itemCount = getItemCount();

  const isFreeDelivery = deliveryFee === 0;
  const progressToFreeDelivery = Math.min(
    (fromPiastres(subtotal) / fromPiastres(FREE_DELIVERY_THRESHOLD)) * 100,
    100
  );
  const remainingForFree = Math.max(0, fromPiastres(FREE_DELIVERY_THRESHOLD) - fromPiastres(subtotal));

  return (
    <div className="space-y-3">
      {/* Free delivery progress */}
      {!isFreeDelivery && itemCount > 0 && (
        <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--ggh-primary)' }}>
            {t(lang, 'freeDeliveryMessage', { amount: `${remainingForFree.toFixed(0)} ${t(lang, 'egp')}` })}
          </p>
          <Progress
            value={progressToFreeDelivery}
            className="h-2"
            style={{ backgroundColor: '#C8E6C9' }}
          />
        </div>
      )}

      <Separator />

      {/* Subtotal */}
      <div className="flex justify-between text-sm">
        <span style={{ color: 'var(--ggh-text-secondary)' }}>{t(lang, 'subtotal')}</span>
        <span className="font-semibold" style={{ color: 'var(--ggh-text)' }}>
          {formatPriceWithCurrency(subtotal, lang)}
        </span>
      </div>

      {/* Delivery fee */}
      <div className="flex justify-between text-sm">
        <span style={{ color: 'var(--ggh-text-secondary)' }}>{t(lang, 'deliveryFee')}</span>
        <span
          className="font-semibold"
          style={{ color: isFreeDelivery ? 'var(--ggh-primary)' : 'var(--ggh-text)' }}
        >
          {isFreeDelivery ? t(lang, 'free') : formatPriceWithCurrency(deliveryFee, lang)}
        </span>
      </div>

      <Separator />

      {/* Total */}
      <div className="flex justify-between text-lg">
        <span className="font-semibold" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'total')}
        </span>
        <span className="font-bold" style={{ color: 'var(--ggh-primary)' }}>
          {formatPriceWithCurrency(total, lang)}
        </span>
      </div>
    </div>
  );
}

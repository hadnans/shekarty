'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Lang, type Piastres, formatPriceWithCurrency, multiplyPiastres } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { useCartStore, type CartItem } from '@/stores/cart-store';

interface CartItemRowProps {
  item: CartItem;
  lang?: Lang;
}

export default function CartItemRow({ item, lang: langProp }: CartItemRowProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const { incrementQuantity, decrementQuantity, removeItem } = useCartStore();

  const name = lang === 'ar' ? item.nameAr : item.nameEn;
  const brand = lang === 'ar' ? item.brandAr : item.brandEn;
  const lineTotal = multiplyPiastres(item.price, item.quantity);

  return (
    <div
      className="flex gap-3 p-3 rounded-lg"
      style={{ backgroundColor: '#FAFAFA', border: '1px solid var(--ggh-border)' }}
    >
      {/* Item icon */}
      <div
        className="w-12 h-12 flex items-center justify-center rounded-full shrink-0"
        style={{ backgroundColor: '#F5F5F5' }}
      >
        <span className="text-2xl" aria-hidden="true">{item.icon}</span>
      </div>

      {/* Item details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </h4>
        <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {item.weight}
        </p>

        {/* Quantity controls + price */}
        <div className="flex items-center justify-between mt-2">
          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-10 w-10 rounded-lg"
              style={{ borderColor: 'var(--ggh-border)' }}
              onClick={() => decrementQuantity(item.productId)}
              aria-label={t(lang, 'decreaseQuantity')}
            >
              <Minus className="size-4" />
            </Button>
            <span
              className="w-8 text-center text-base font-bold"
              style={{ color: 'var(--ggh-text)' }}
            >
              {item.quantity}
            </span>
            <Button
              variant="outline"
              className="h-10 w-10 rounded-lg"
              style={{ borderColor: 'var(--ggh-border)' }}
              onClick={() => incrementQuantity(item.productId)}
              disabled={item.quantity >= item.maxPerOrder}
              aria-label={t(lang, 'increaseQuantity')}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Price */}
          <span
            className="text-base font-bold"
            style={{ color: 'var(--ggh-primary)' }}
          >
            {formatPriceWithCurrency(lineTotal, lang)}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        className="h-10 w-10 shrink-0 self-start"
        onClick={() => removeItem(item.productId)}
        aria-label={t(lang, 'removeFromCart')}
      >
        <Trash2 className="size-4 text-red-400" />
      </Button>
    </div>
  );
}

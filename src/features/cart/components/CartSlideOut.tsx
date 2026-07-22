'use client';

import { ShoppingCart, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useLangStore } from '@/stores/lang-store';
import { useCartStore } from '@/stores/cart-store';
import { t } from '@/lib/ggh/i18n';
import { type Lang } from '@/types/ggh';
import CartItemRow from './CartItemRow';
import CartSummary from './CartSummary';

interface CartSlideOutProps {
  lang?: Lang;
  onCheckout?: () => void;
}

export default function CartSlideOut({ lang: langProp, onCheckout }: CartSlideOutProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;
  const { isOpen, closeCart, items, getItemCount } = useCartStore();
  const itemCount = getItemCount();
  const side = isRTL ? 'left' : 'right';

  const handleCheckout = () => {
    closeCart();
    onCheckout?.();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side={side}
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="p-4 pb-2">
          <SheetTitle
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'var(--ggh-text)' }}
          >
            <ShoppingCart className="size-5" style={{ color: 'var(--ggh-primary)' }} />
            {t(lang, 'yourCart')}
            {itemCount > 0 && (
              <span
                className="text-sm font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F5F5F5', color: 'var(--ggh-text-secondary)' }}
              >
                {itemCount} {t(lang, 'items')}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Cart items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingCart className="size-16 mb-4" style={{ color: '#E0E0E0' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
              {t(lang, 'emptyCart')}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--ggh-text-secondary)' }}>
              {t(lang, 'searchHint')}
            </p>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} lang={lang} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer with summary */}
        {items.length > 0 && (
          <SheetFooter className="p-4 pt-2">
            <div className="w-full space-y-3">
              <CartSummary lang={lang} />

              {/* Checkout button */}
              <Button
                className="w-full h-14 text-base font-bold rounded-xl"
                style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
                onClick={handleCheckout}
              >
                {t(lang, 'proceedToCheckout')}
              </Button>

              {/* Continue shopping */}
              <Button
                variant="ghost"
                className="w-full h-12 text-sm font-medium rounded-lg"
                style={{ color: 'var(--ggh-text-secondary)' }}
                onClick={closeCart}
              >
                {isRTL ? <ArrowLeft className="size-4 me-2" /> : <ArrowRight className="size-4 ms-2" />}
                {t(lang, 'continueShopping')}
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

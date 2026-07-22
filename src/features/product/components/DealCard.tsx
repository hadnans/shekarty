'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  type Deal,
  type Product,
  type Lang,
  type Piastres,
  formatPriceWithCurrency,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useCartStore } from '@/stores/cart-store';
import { useLangStore } from '@/stores/lang-store';
import DealTimer from './DealTimer';

interface DealCardProps {
  deal?: Deal;
  product?: Product;
  lang?: Lang;
}

export default function DealCard({ deal, product: productProp, lang: langProp }: DealCardProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const product = deal?.product || productProp;
  if (!product) return null;

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const brand = lang === 'ar' ? product.brandAr : product.brandEn;
  const maxQty = deal?.maxQuantity || 100;
  const claimed = deal?.claimedCount || 0;
  const stockRemaining = maxQty - claimed;
  const stockPercent = maxQty > 0 ? (claimed / maxQty) * 100 : 0;
  const discountPercent = deal?.discountPercent || (product.yesterdayPrice ? Math.round(((product.yesterdayPrice - product.todayPrice) / product.yesterdayPrice) * 100) : 0);
  const dealPrice = deal?.dealPrice || product.todayPrice;
  const originalPrice = deal?.originalPrice || product.yesterdayPrice || product.todayPrice;
  const endsAt = deal?.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const handleAdd = () => {
    if (stockRemaining <= 0) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      className="min-w-[240px] sm:min-w-[280px] snap-start shrink-0 rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--ggh-border)',
      }}
    >
      {/* Product icon area */}
      <div className="flex items-center justify-center py-6 relative">
        <span className="text-5xl" role="img" aria-label={name}>
          {product.icon}
        </span>

        {/* Big discount badge */}
        <Badge
          className="absolute top-3 text-sm font-extrabold px-2.5 py-1 border-0"
          style={{ backgroundColor: '#FF6D00', color: '#FFFFFF' }}
        >
          <Flame className="size-3.5 me-1" />
          -{discountPercent}%
        </Badge>
      </div>

      {/* Deal info */}
      <div className="p-4 pt-0 space-y-3">
        {/* Product name */}
        <h3 className="text-base font-semibold" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </h3>

        {/* Brand */}
        <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {product.weight}
        </p>

        {/* Prices */}
        <div className="flex items-baseline gap-2">
          <span
            className="text-xl font-extrabold"
            style={{ color: 'var(--ggh-accent)' }}
          >
            {formatPriceWithCurrency(dealPrice, lang)}
          </span>
          <span
            className="text-sm line-through"
            style={{ color: 'var(--ggh-text-secondary)' }}
          >
            {formatPriceWithCurrency(originalPrice, lang)}
          </span>
        </div>

        {/* Countdown timer */}
        <DealTimer endsAt={endsAt} lang={lang} />

        {/* Stock remaining indicator */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--ggh-text-secondary)' }}>
              {lang === 'ar' ? `متبقي ${stockRemaining}` : `${stockRemaining} left`}
            </span>
            <span style={{ color: 'var(--ggh-text-secondary)' }}>
              {Math.round(stockPercent)}%
            </span>
          </div>
          <Progress
            value={stockPercent}
            className="h-2"
            style={{
              backgroundColor: '#F5F5F5',
            }}
          />
        </div>

        {/* Add to cart button with urgency */}
        <Button
          className="w-full h-12 text-base font-bold rounded-lg"
          style={{
            backgroundColor: added ? 'var(--ggh-primary-light)' : 'var(--ggh-accent)',
            color: '#FFFFFF',
          }}
          onClick={handleAdd}
          disabled={stockRemaining <= 0 || added}
          aria-label={t(lang, 'addToCart')}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span
                key="added"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5"
              >
                <Check className="size-4" />
                {t(lang, 'added')}
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5"
              >
                <ShoppingCart className="size-4" />
                {stockRemaining <= 0
                  ? lang === 'ar'
                    ? 'تم النفاد'
                    : 'Sold Out'
                  : t(lang, 'addToCart')}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Star, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Product, type Lang, type Piastres, formatPriceWithCurrency, calcDiscountPercent } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useCartStore } from '@/stores/cart-store';
import { useLangStore } from '@/stores/lang-store';

interface ProductCardProps {
  product: Product;
  lang?: Lang;
}

export default function ProductCard({ product, lang: langProp }: ProductCardProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const brand = lang === 'ar' ? product.brandAr : product.brandEn;

  const discount = product.yesterdayPrice
    ? calcDiscountPercent(product.todayPrice, product.yesterdayPrice)
    : 0;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
      style={{ border: '1px solid var(--ggh-border)' }}
    >
      {/* Product icon area */}
      <div
        className="flex items-center justify-center py-5 relative"
        style={{ backgroundColor: '#F5F5F5' }}
      >
        <span className="text-5xl sm:text-6xl" role="img" aria-label={name}>
          {product.icon}
        </span>

        {/* Discount badge */}
        {discount > 0 && (
          <Badge
            className="absolute top-3 text-xs font-bold px-2 py-0.5 border-0"
            style={{ backgroundColor: '#FFF3E0', color: 'var(--ggh-accent)' }}
          >
            -{discount}% {t(lang, 'off')}
          </Badge>
        )}

        {/* Stock status */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-gray-200 text-gray-600">
              {t(lang, 'outOfStock')}
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="p-4">
        {/* Rating stars */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${
                  i < Math.round(product.rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="text-xs font-medium ms-1" style={{ color: 'var(--ggh-text-secondary)' }}>
              {product.rating}
            </span>
          </div>
        )}

        {/* Product name */}
        <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </h3>

        {/* Brand & weight */}
        <p className="text-sm mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {product.weight}
        </p>

        {/* Stock indicator */}
        {isLowStock && !isOutOfStock && (
          <p className="text-xs font-medium mt-1" style={{ color: '#9A6700' }}>
            {t(lang, 'lowStock', { n: product.stock })}
          </p>
        )}

        {/* Price section */}
        <div className="mt-3 space-y-1">
          {/* Today price */}
          <div className="flex items-baseline gap-2">
            <span
              className="text-xl font-extrabold"
              style={{ color: discount > 0 ? 'var(--ggh-primary)' : 'var(--ggh-text)' }}
            >
              {formatPriceWithCurrency(product.todayPrice, lang)}
            </span>
          </div>

          {/* Yesterday price */}
          {product.yesterdayPrice && discount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-sm line-through"
                style={{ color: 'var(--ggh-text-secondary)' }}
              >
                {formatPriceWithCurrency(product.yesterdayPrice, lang)}
              </span>
            </div>
          )}
        </div>

        {/* Add to cart button */}
        <Button
          className="w-full h-12 mt-3 text-base font-bold rounded-xl transition-all"
          style={{
            backgroundColor: added
              ? 'var(--ggh-primary-light)'
              : isOutOfStock
              ? '#E0E0E0'
              : 'var(--ggh-primary)',
            color: '#FFFFFF',
          }}
          onClick={handleAdd}
          disabled={isOutOfStock}
          aria-label={t(lang, 'addToCart')}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span
                key="added"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <Check className="size-4" />
                {t(lang, 'added')}
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <ShoppingCart className="size-4" />
                {isOutOfStock ? t(lang, 'outOfStock') : t(lang, 'addToCart')}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

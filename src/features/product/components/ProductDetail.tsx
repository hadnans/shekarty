'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart, Check, Star, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  type Product,
  type Lang,
  type Piastres,
  formatPriceWithCurrency,
  calcDiscountPercent,
  calcSavings,
  toPiastres,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useCartStore } from '@/stores/cart-store';
import { useLangStore } from '@/stores/lang-store';

interface ProductDetailProps {
  product: Product;
  lang?: Lang;
  onClose?: () => void;
}

export default function ProductDetail({ product, lang: langProp, onClose }: ProductDetailProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(product.minOrderQty || 1);
  const [added, setAdded] = useState(false);

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const brand = lang === 'ar' ? product.brandAr : product.brandEn;
  const description = lang === 'ar' ? product.descriptionAr : product.descriptionEn;

  const discount = product.yesterdayPrice
    ? calcDiscountPercent(product.todayPrice, product.yesterdayPrice)
    : 0;

  const savings = product.yesterdayPrice
    ? calcSavings(product.todayPrice, product.yesterdayPrice)
    : 0 as Piastres;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const incrementQty = () => {
    setQuantity((prev) => Math.min(prev + 1, product.maxPerOrder));
  };

  const decrementQty = () => {
    setQuantity((prev) => Math.max(prev - 1, product.minOrderQty || 1));
  };

  return (
    <div className="flex flex-col">
      {/* Product icon/image area */}
      <div
        className="flex items-center justify-center py-8 relative"
        style={{ backgroundColor: '#F5F5F5' }}
      >
        <span className="text-7xl sm:text-8xl" role="img" aria-label={name}>
          {product.icon}
        </span>

        {discount > 0 && (
          <Badge
            className="absolute top-4 text-sm font-bold px-3 py-1 border-0"
            style={{ backgroundColor: '#FFF3E0', color: 'var(--ggh-accent)' }}
          >
            -{discount}% {t(lang, 'off')}
          </Badge>
        )}
      </div>

      {/* Product details */}
      <div className="p-6 space-y-4">
        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-4 ${
                  i < Math.round(product.rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="text-sm font-medium ms-1" style={{ color: 'var(--ggh-text-secondary)' }}>
              {product.rating} ({product.reviewCount})
            </span>
          </div>
        )}

        {/* Name */}
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </h2>

        {/* Brand & weight */}
        <p className="text-base" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {product.weight}
        </p>

        {/* Description */}
        {description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ggh-text-secondary)' }}>
            {description}
          </p>
        )}

        {/* Stock status */}
        {isOutOfStock ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" style={{ color: '#CF222E' }} />
            <span className="text-sm font-medium" style={{ color: '#CF222E' }}>
              {t(lang, 'outOfStock')}
            </span>
          </div>
        ) : isLowStock ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" style={{ color: '#9A6700' }} />
            <span className="text-sm font-medium" style={{ color: '#9A6700' }}>
              {t(lang, 'lowStock', { n: product.stock })}
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium" style={{ color: 'var(--ggh-primary)' }}>
            {t(lang, 'inStock')}
          </span>
        )}

        <Separator />

        {/* Price breakdown */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
              {t(lang, 'priceToday')}:
            </span>
            <span
              className="text-2xl font-extrabold"
              style={{ color: discount > 0 ? 'var(--ggh-primary)' : 'var(--ggh-text)' }}
            >
              {formatPriceWithCurrency(product.todayPrice, lang)}
            </span>
          </div>

          {product.yesterdayPrice && discount > 0 && (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
                  {t(lang, 'priceYesterday')}:
                </span>
                <span
                  className="text-base line-through"
                  style={{ color: 'var(--ggh-text-secondary)' }}
                >
                  {formatPriceWithCurrency(product.yesterdayPrice, lang)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--ggh-primary)' }}>
                  {t(lang, 'savings')}:
                </span>
                <span className="text-base font-bold" style={{ color: 'var(--ggh-primary)' }}>
                  {formatPriceWithCurrency(savings, lang)}
                </span>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Quantity selector */}
        {!isOutOfStock && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
              {t(lang, 'quantity')}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-12 w-12 rounded-lg"
                style={{ borderColor: 'var(--ggh-border)' }}
                onClick={decrementQty}
                disabled={quantity <= (product.minOrderQty || 1)}
                aria-label={t(lang, 'decreaseQuantity')}
              >
                <Minus className="size-4" />
              </Button>
              <span
                className="text-xl font-bold w-10 text-center"
                style={{ color: 'var(--ggh-text)' }}
              >
                {quantity}
              </span>
              <Button
                variant="outline"
                className="h-12 w-12 rounded-lg"
                style={{ borderColor: 'var(--ggh-border)' }}
                onClick={incrementQty}
                disabled={quantity >= product.maxPerOrder}
                aria-label={t(lang, 'increaseQuantity')}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Add to cart CTA */}
        <Button
          className="w-full h-14 text-lg font-bold rounded-xl"
          style={{
            backgroundColor: added
              ? 'var(--ggh-primary-light)'
              : isOutOfStock
              ? '#E0E0E0'
              : 'var(--ggh-primary)',
            color: '#FFFFFF',
          }}
          onClick={handleAdd}
          disabled={isOutOfStock || added}
          aria-label={t(lang, 'addToCart')}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span
                key="added"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2"
              >
                <Check className="size-5" />
                {t(lang, 'added')}
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="size-5" />
                {isOutOfStock ? t(lang, 'outOfStock') : t(lang, 'addToCart')}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

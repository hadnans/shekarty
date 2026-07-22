'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { products, type Product } from '@/lib/ggh/data';

interface ProductGridProps {
  lang: 'en' | 'ar';
  t: Record<string, string>;
  onAddToCart: (product: Product) => void;
}

function ProductCard({
  product,
  lang,
  t,
  onAddToCart,
}: {
  product: Product;
  lang: 'en' | 'ar';
  t: Record<string, string>;
  onAddToCart: (product: Product) => void;
}) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const brand = lang === 'ar' ? product.brandAr : product.brandEn;
  const priceDrop = product.yesterdayPrice - product.todayPrice;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}
    >
      {/* Product icon area */}
      <div
        className="flex items-center justify-center py-5"
        style={{ backgroundColor: product.bgColor }}
      >
        <span className="text-5xl sm:text-6xl" role="img" aria-label={name}>
          {product.icon}
        </span>
      </div>

      {/* Product info */}
      <div className="p-4">
        {/* Star rating */}
        <div className="flex items-center gap-1 mb-1">
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
            {product.rating}
          </span>
        </div>

        {/* Product name */}
        <h3 className="text-lg font-bold leading-tight" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </h3>

        {/* Brand & weight */}
        <p className="text-base mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {product.weight}
        </p>

        {/* Price section */}
        <div className="mt-3 space-y-1">
          {/* Today price */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--ggh-primary)' }}>
              {t.priceToday}:
            </span>
            <span
              className="text-2xl font-extrabold"
              style={{ color: 'var(--ggh-primary)' }}
            >
              {product.todayPrice} {t.egp}
            </span>
          </div>

          {/* Yesterday price + price drop */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
              {t.priceYesterday}:
            </span>
            <span
              className="text-base line-through"
              style={{ color: 'var(--ggh-text-secondary)' }}
            >
              {product.yesterdayPrice} {t.egp}
            </span>
            {priceDrop > 0 && (
              <span
                className="text-sm font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: '#FFF3E0',
                  color: 'var(--ggh-accent)',
                }}
              >
                ↓ {priceDrop.toFixed(1)} {t.egp}
              </span>
            )}
          </div>
        </div>

        {/* Add to cart button */}
        <Button
          className="w-full h-14 mt-4 text-lg font-bold rounded-xl transition-all"
          style={{
            backgroundColor: added ? 'var(--ggh-primary-light)' : 'var(--ggh-primary)',
            color: '#FFFFFF',
          }}
          onClick={handleAdd}
        >
          {added ? t.added : t.addToCart}
        </Button>
      </div>
    </div>
  );
}

export default function ProductGrid({ lang, t, onAddToCart }: ProductGridProps) {
  return (
    <section id="products" className="py-8 sm:py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section title */}
        <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--ggh-text)' }}>
          {t.popularProducts}
        </h2>

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              t={t}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

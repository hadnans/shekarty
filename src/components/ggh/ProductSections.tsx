'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { products, categories, sectionOrder, type Product } from '@/lib/ggh/data';

interface ProductSectionsProps {
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
  const discountPct = Math.round((priceDrop / product.yesterdayPrice) * 100);
  const isRTL = lang === 'ar';

  return (
    <div
      className="min-w-[200px] sm:min-w-[230px] shrink-0 rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--ggh-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Product icon area - white bg with small emoji circle */}
      <div className="flex items-center justify-center py-5 relative">
        <div
          className="w-12 h-12 flex items-center justify-center rounded-full"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <span className="text-2xl" role="img" aria-label={name}>
            {product.icon}
          </span>
        </div>
      </div>

      {/* Product info */}
      <div className="p-4 pt-0">
        {/* Product name */}
        <h3 className="text-base font-semibold leading-tight" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </h3>

        {/* Brand & weight */}
        <p className="text-sm mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {product.weight}
        </p>

        {/* Divider */}
        <div className="my-3" style={{ borderTop: '1px solid var(--ggh-border)' }} />

        {/* Price section */}
        <div className="space-y-1">
          {/* Today price */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
              {t.priceToday}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: 'var(--ggh-primary)' }}
            >
              {product.todayPrice} {t.egp}
            </span>
          </div>

          {/* Yesterday price + price drop */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm line-through"
              style={{ color: 'var(--ggh-text-secondary)' }}
            >
              {t.priceYesterday} {product.yesterdayPrice} {t.egp}
            </span>
            {priceDrop > 0 && (
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: '#FFF3E0',
                  color: '#E65100',
                }}
              >
                ↓ {discountPct}%
              </span>
            )}
          </div>
        </div>

        {/* Add to cart button - outlined */}
        <Button
          variant="outline"
          className="w-full h-10 mt-3 text-sm font-semibold rounded-lg transition-all"
          style={{
            borderColor: added ? 'var(--ggh-primary-light)' : 'var(--ggh-primary)',
            color: added ? '#FFFFFF' : 'var(--ggh-primary)',
            backgroundColor: added ? 'var(--ggh-primary-light)' : 'transparent',
          }}
          onClick={handleAdd}
          onMouseEnter={(e) => {
            if (!added) {
              e.currentTarget.style.backgroundColor = 'var(--ggh-primary)';
              e.currentTarget.style.color = '#FFFFFF';
            }
          }}
          onMouseLeave={(e) => {
            if (!added) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--ggh-primary)';
            }
          }}
        >
          {added ? t.added : t.addToCart}
        </Button>
      </div>
    </div>
  );
}

export default function ProductSections({ lang, t, onAddToCart }: ProductSectionsProps) {
  const isRTL = lang === 'ar';

  // Group products by category using sectionOrder
  const sections = sectionOrder
    .map((categoryId) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return null;
      const sectionProducts = products.filter((p) => p.categoryId === categoryId);
      if (sectionProducts.length === 0) return null;
      return { category, products: sectionProducts };
    })
    .filter(Boolean) as { category: typeof categories[0]; products: Product[] }[];

  // Get section title from translations
  const getSectionTitle = (category: typeof categories[0]) => {
    if (category.sectionKey && t[category.sectionKey]) {
      return t[category.sectionKey];
    }
    return lang === 'ar' ? category.nameAr : category.nameEn;
  };

  return (
    <section id="products" className="py-8 sm:py-10 px-4" style={{ backgroundColor: 'var(--ggh-bg-alt)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {sections.map(({ category, products: sectionProducts }) => (
          <div key={category.id}>
            {/* Section header with green accent bar + View All */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--ggh-primary)' }} />
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--ggh-text)' }}>
                  {getSectionTitle(category)}
                </h2>
              </div>
              <a
                href="#"
                className="text-sm font-medium flex items-center gap-1 hover:underline"
                style={{ color: 'var(--ggh-primary)' }}
              >
                {t.viewAll}
              </a>
            </div>

            {/* Horizontal scrollable product row */}
            <div className="flex gap-4 overflow-x-auto pb-2 ggh-scroll">
              {sectionProducts.map((product) => (
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
        ))}
      </div>
    </section>
  );
}

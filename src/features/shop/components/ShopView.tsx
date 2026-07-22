'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { type Lang, type Product, type Category, type Deal, formatPriceWithCurrency } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import ProductCard from '@/features/product/components/ProductCard';
import DealCard from '@/features/product/components/DealCard';

interface ShopViewProps {
  lang: Lang;
  categories: Category[];
  products: Product[];
  deals: (Deal & { product: Product })[];
  productsByCategory: { category: Category; products: Product[] }[];
  featuredProducts: Product[];
  isLoading: boolean;
  onCategoryClick: (slug: string) => void;
}

export default function ShopView({
  lang,
  categories,
  products,
  deals,
  productsByCategory,
  featuredProducts,
  isLoading,
  onCategoryClick,
}: ShopViewProps) {
  return (
    <div>
      {/* Hero Banner */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #1B6820 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-5xl font-extrabold text-white leading-tight whitespace-pre-line"
            >
              {t(lang, 'heroTitle')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-4 text-base sm:text-lg text-green-100 max-w-2xl mx-auto"
            >
              {t(lang, 'heroSubtitle')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8"
            >
              <Button
                className="h-14 px-8 text-lg font-bold rounded-2xl shadow-lg"
                style={{ backgroundColor: '#FF6D00', color: '#FFFFFF' }}
                onClick={() => {
                  document.getElementById('categories-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <ShoppingBag className="size-5 me-2" />
                {t(lang, 'shopNow')}
              </Button>
            </motion.div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-20 -end-20 size-64 rounded-full opacity-10" style={{ backgroundColor: '#FF6D00' }} />
        <div className="absolute -bottom-16 -start-16 size-48 rounded-full opacity-10" style={{ backgroundColor: '#FFFFFF' }} />
      </section>

      {/* Categories Grid */}
      <section id="categories-section" className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'exploreCategories')}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat, index) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onCategoryClick(cat.slug)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:shadow-md active:scale-95 min-h-[96px]"
                style={{ backgroundColor: cat.color || '#F5F5F5' }}
                aria-label={lang === 'ar' ? cat.nameAr : cat.nameEn}
              >
                <span className="text-3xl sm:text-4xl" role="img">{cat.icon}</span>
                <span className="text-sm font-semibold text-center leading-tight" style={{ color: 'var(--ggh-text)' }}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </span>
                {cat.productCount !== undefined && (
                  <span className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {cat.productCount} {t(lang, 'items')}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </section>

      {/* Hot Deals Section */}
      {deals.length > 0 && (
        <section className="py-8" style={{ backgroundColor: '#FFF8F0' }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <Flame className="size-7" style={{ color: '#FF6D00' }} />
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'hotDeals')}
              </h2>
              <Badge className="text-xs font-bold px-2.5 py-1 border-0" style={{ backgroundColor: '#FF6D00', color: '#FFFFFF' }}>
                {deals.length} {lang === 'ar' ? 'عرض' : 'deals'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {deals.slice(0, 8).map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  lang={lang}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="size-6" style={{ color: 'var(--ggh-primary)' }} />
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
              {t(lang, 'bestSellers')}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Product Sections by Category */}
      {productsByCategory.map((group) => (
        <section
          key={group.category.id}
          id={`section-${group.category.slug}`}
          className="max-w-7xl mx-auto px-4 py-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{group.category.icon}</span>
            <h2 className="text-xl font-bold" style={{ color: 'var(--ggh-text)' }}>
              {lang === 'ar' ? group.category.nameAr : group.category.nameEn}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {group.products.length}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.products.map((product) => (
              <ProductCard key={product.id} product={product} lang={lang} />
            ))}
          </div>
        </section>
      ))}

      {/* Loading State */}
      {isLoading && (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      )}

      {/* Bottom spacing for mobile nav */}
      <div className="h-20 sm:h-0" />
    </div>
  );
}

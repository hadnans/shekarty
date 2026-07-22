'use client';

import { Search, PackageOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type Lang,
  type Product,
  type Category,
  type SearchResult as SearchResultType,
  formatPriceWithCurrency,
  calcDiscountPercent,
} from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResultType | null;
  query: string;
  isLoading?: boolean;
  onProductClick?: (product: Product) => void;
  onCategoryClick?: (category: Category) => void;
  lang?: Lang;
}

function ProductResultItem({
  product,
  lang,
  onClick,
}: {
  product: Product;
  lang: Lang;
  onClick?: (product: Product) => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const brand = lang === 'ar' ? product.brandAr : product.brandEn;
  const discount = product.yesterdayPrice
    ? calcDiscountPercent(product.todayPrice, product.yesterdayPrice)
    : 0;

  return (
    <button
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-start min-h-[48px]"
      onClick={() => onClick?.(product)}
    >
      <span className="text-2xl shrink-0" aria-hidden="true">{product.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ggh-text)' }}>
          {name}
        </p>
        <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
          {brand} · {product.weight}
        </p>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-bold" style={{ color: discount > 0 ? 'var(--ggh-primary)' : 'var(--ggh-text)' }}>
          {formatPriceWithCurrency(product.todayPrice, lang)}
        </p>
        {discount > 0 && (
          <p className="text-xs line-through" style={{ color: 'var(--ggh-text-secondary)' }}>
            {formatPriceWithCurrency(product.yesterdayPrice!, lang)}
          </p>
        )}
      </div>
    </button>
  );
}

function CategoryResultItem({
  category,
  lang,
  onClick,
}: {
  category: Category;
  lang: Lang;
  onClick?: (category: Category) => void;
}) {
  const name = lang === 'ar' ? category.nameAr : category.nameEn;

  return (
    <button
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-start min-h-[48px]"
      onClick={() => onClick?.(category)}
    >
      <span className="text-2xl" aria-hidden="true">{category.icon}</span>
      <span className="text-sm font-semibold" style={{ color: 'var(--ggh-text)' }}>
        {name}
      </span>
      {category.productCount !== undefined && (
        <span className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
          ({category.productCount})
        </span>
      )}
    </button>
  );
}

export default function SearchResults({
  results,
  query,
  isLoading = false,
  onProductClick,
  onCategoryClick,
  lang: langProp,
}: SearchResultsProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No query
  if (!query.trim()) {
    return null;
  }

  // No results
  if (!results || (results.products.length === 0 && results.categories.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="size-12 mb-3" style={{ color: '#E0E0E0' }} />
        <p className="text-lg font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
          {t(lang, 'noResults')}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--ggh-text-secondary)' }}>
          {t(lang, 'searchHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category results */}
      {results.categories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, 'categories')}
          </h3>
          {results.categories.map((cat) => (
            <CategoryResultItem
              key={cat.id}
              category={cat}
              lang={lang}
              onClick={onCategoryClick}
            />
          ))}
        </div>
      )}

      {/* Product results */}
      {results.products.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, 'popularProducts')}
          </h3>
          <div className="max-h-96 overflow-y-auto">
            {results.products.map((product) => (
              <ProductResultItem
                key={product.id}
                product={product}
                lang={lang}
                onClick={onProductClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

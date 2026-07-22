'use client';

import { type Product, type Lang } from '@/types/ggh';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen } from 'lucide-react';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  lang?: Lang;
  isLoading?: boolean;
  title?: string;
  emptyMessage?: string;
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--ggh-border)' }}>
      <Skeleton className="h-32 w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function ProductGrid({
  products,
  lang: langProp,
  isLoading = false,
  title,
  emptyMessage,
}: ProductGridProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  if (isLoading) {
    return (
      <section className="py-8 sm:py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {title && (
            <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--ggh-text)' }}>
              {title}
            </h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-8 sm:py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {title && (
            <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--ggh-text)' }}>
              {title}
            </h2>
          )}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen className="size-16 mb-4" style={{ color: '#E0E0E0' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
              {emptyMessage ?? t(lang, 'noResults')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {title && (
          <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--ggh-text)' }}>
            {title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  );
}

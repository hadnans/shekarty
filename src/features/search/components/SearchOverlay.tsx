'use client';

import { Search as SearchIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { type Lang, type Product, type Category, formatPriceWithCurrency } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: { products: Product[]; categories: Category[] } | undefined;
  searchLoading: boolean;
  lang: Lang;
  onCategoryClick: (slug: string) => void;
}

export default function SearchOverlay({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchLoading,
  lang,
  onCategoryClick,
}: SearchOverlayProps) {
  const { isRTL } = useLangStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">{t(lang, 'search')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 -translate-y-1/2 size-5" style={{ color: 'var(--ggh-text-secondary)', [isRTL ? 'right' : 'left']: '14px' }} />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={t(lang, 'search')}
              className="h-14 text-lg rounded-xl"
              style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: '44px' }}
              autoFocus
              dir="ltr"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 -translate-y-1/2 h-8 w-8"
                style={{ [isRTL ? 'left' : 'right']: '8px' }}
                onClick={() => onSearchQueryChange('')}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          {/* Search Results */}
          {searchLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          )}

          {searchResults && searchQuery.length >= 2 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.categories && searchResults.categories.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {t(lang, 'categories')}
                  </p>
                  {searchResults.categories.map((cat) => (
                    <button
                      key={cat.id}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-50 text-start"
                      onClick={() => {
                        onOpenChange(false);
                        onCategoryClick(cat.slug);
                      }}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-medium" style={{ color: 'var(--ggh-text)' }}>
                        {lang === 'ar' ? cat.nameAr : cat.nameEn}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.products && searchResults.products.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {t(lang, 'popularProducts')}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {searchResults.products.slice(0, 6).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                      >
                        <span className="text-2xl">{product.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--ggh-text)' }}>
                            {lang === 'ar' ? product.nameAr : product.nameEn}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--ggh-primary)' }}>
                            {formatPriceWithCurrency(product.todayPrice, lang)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!searchResults.products || searchResults.products.length === 0) &&
                (!searchResults.categories || searchResults.categories.length === 0) && (
                <div className="text-center py-8">
                  <p style={{ color: 'var(--ggh-text-secondary)' }}>
                    {t(lang, 'noResults')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {t(lang, 'searchHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
                {t(lang, 'searchHint')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

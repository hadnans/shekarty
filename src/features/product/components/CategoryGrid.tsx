'use client';

import { motion } from 'framer-motion';
import { type Category, type Lang } from '@/types/ggh';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';

interface CategoryGridProps {
  categories: Category[];
  lang?: Lang;
  onCategoryClick?: (category: Category) => void;
}

export default function CategoryGrid({ categories, lang: langProp, onCategoryClick }: CategoryGridProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  return (
    <section id="categories" className="py-8 sm:py-10 px-4" style={{ backgroundColor: 'var(--ggh-bg-alt)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Section title with accent bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--ggh-primary)' }} />
          <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'exploreCategories')}
          </h2>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((category, index) => {
            const name = lang === 'ar' ? category.nameAr : category.nameEn;
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl bg-white transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 min-h-[48px]"
                style={{ border: '1px solid var(--ggh-border)' }}
                onClick={() => onCategoryClick?.(category)}
                aria-label={name}
              >
                {/* Emoji icon */}
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full mb-2"
                  style={{ backgroundColor: '#F5F5F5' }}
                >
                  <span className="text-2xl sm:text-3xl" aria-hidden="true">
                    {category.icon}
                  </span>
                </div>

                {/* Category name */}
                <span
                  className="text-sm sm:text-base font-medium text-center leading-tight"
                  style={{ color: 'var(--ggh-text)' }}
                >
                  {name}
                </span>

                {/* Product count */}
                {category.productCount !== undefined && (
                  <span
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--ggh-text-secondary)' }}
                  >
                    {category.productCount} {t(lang, 'items')}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

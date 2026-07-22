'use client';

import { categories } from '@/lib/ggh/data';

interface CategoryGridProps {
  lang: 'en' | 'ar';
  t: Record<string, string>;
}

export default function CategoryGrid({ lang, t }: CategoryGridProps) {
  return (
    <section id="categories" className="py-8 sm:py-10 px-4" style={{ backgroundColor: 'var(--ggh-bg-alt)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Section title with accent bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--ggh-primary)' }} />
          <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--ggh-text)' }}>
            {t.exploreCategories}
          </h2>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-white transition-all hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
              style={{ border: '1px solid var(--ggh-border)' }}
              aria-label={lang === 'ar' ? cat.nameAr : cat.nameEn}
            >
              {/* Emoji icon in small circle */}
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full mb-2"
                style={{ backgroundColor: '#F5F5F5' }}
              >
                <span className="text-xl sm:text-2xl" aria-hidden="true">
                  {cat.icon}
                </span>
              </div>
              {/* Category name */}
              <span
                className="text-xs sm:text-sm font-medium text-center leading-tight"
                style={{ color: 'var(--ggh-text)' }}
              >
                {lang === 'ar' ? cat.nameAr : cat.nameEn}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

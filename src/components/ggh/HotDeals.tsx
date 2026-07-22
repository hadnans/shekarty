'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { deals } from '@/lib/ggh/data';

interface HotDealsProps {
  lang: 'en' | 'ar';
  t: Record<string, string>;
}

function CountdownTimer({ lang, t }: { lang: 'en' | 'ar'; t: Record<string, string> }) {
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60); // 3 hours in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
      <Clock className="size-4" />
      <span>{t.dealEndsIn}</span>
      <span className="font-mono font-semibold" style={{ color: 'var(--ggh-accent)' }}>
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

export default function HotDeals({ lang, t }: HotDealsProps) {
  return (
    <section id="deals" className="py-8 sm:py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section title with accent bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--ggh-accent)' }} />
            <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--ggh-text)' }}>
              {t.hotDeals}
            </h2>
          </div>
          <CountdownTimer lang={lang} t={t} />
        </div>

        {/* Horizontal scrollable deals */}
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory ggh-scroll">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="min-w-[220px] sm:min-w-[260px] snap-start shrink-0 rounded-xl overflow-hidden transition-shadow hover:shadow-md"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--ggh-border)' }}
            >
              {/* Product icon area - clean white */}
              <div className="flex items-center justify-center py-6 relative">
                <span className="text-5xl" role="img" aria-label={deal.productEn}>
                  {deal.icon}
                </span>
                {/* Discount badge - small pill in corner */}
                <Badge
                  className="absolute top-3 text-xs font-semibold px-2 py-0.5"
                  style={{ backgroundColor: '#FFF3E0', color: 'var(--ggh-accent)' }}
                >
                  -{deal.discount}% {t.off}
                </Badge>
              </div>

              {/* Deal info */}
              <div className="p-4 pt-0">
                {/* Product name */}
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--ggh-text)' }}>
                  {lang === 'ar' ? deal.productAr : deal.productEn}
                </h3>

                {/* Prices */}
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-xl font-bold"
                    style={{ color: 'var(--ggh-primary)' }}
                  >
                    {deal.dealPrice} {t.egp}
                  </span>
                  <span
                    className="text-sm line-through"
                    style={{ color: 'var(--ggh-text-secondary)' }}
                  >
                    {deal.originalPrice} {t.egp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

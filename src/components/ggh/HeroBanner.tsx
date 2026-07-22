'use client';

import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface HeroBannerProps {
  lang: 'en' | 'ar';
  t: Record<string, string>;
}

export default function HeroBanner({ lang, t }: HeroBannerProps) {
  const isRTL = lang === 'ar';

  return (
    <section
      className="relative overflow-hidden py-14 sm:py-20 md:py-24 px-4"
      style={{
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
      }}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px),
                            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 sm:mb-6 whitespace-pre-line">
          {t.heroTitle}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-green-100/90 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          {t.heroSubtitle}
        </p>

        {/* CTA Button */}
        <Button
          className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg font-semibold rounded-full transition-all hover:brightness-110"
          style={{ backgroundColor: 'var(--ggh-accent)', color: '#FFFFFF' }}
          size="lg"
        >
          {t.shopNow}
          {isRTL ? (
            <ChevronLeft className="size-5 ms-2" />
          ) : (
            <ChevronRight className="size-5 ms-2" />
          )}
        </Button>
      </div>
    </section>
  );
}

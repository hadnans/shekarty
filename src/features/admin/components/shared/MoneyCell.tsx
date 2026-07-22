'use client';

import { type Piastres, type Lang, formatPriceWithCurrency } from '@/types/ggh';

// ============================================
// MONEY CELL COMPONENT
// ============================================

interface MoneyCellProps {
  value: Piastres | number;
  lang: Lang;
  className?: string;
  showCurrency?: boolean;
}

export default function MoneyCell({ value, lang, className, showCurrency = true }: MoneyCellProps) {
  const piastres = (typeof value === 'number' ? value : value) as Piastres;
  const formatted = showCurrency
    ? formatPriceWithCurrency(piastres, lang)
    : formatPriceWithCurrency(piastres, lang).replace(lang === 'ar' ? ' ج.م' : 'EGP ', '').trim();

  return (
    <span className={`font-medium text-foreground ${className || ''}`}>
      {formatted}
    </span>
  );
}

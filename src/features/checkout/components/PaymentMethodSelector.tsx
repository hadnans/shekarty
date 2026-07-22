'use client';

import { Banknote, CreditCard, Wallet, Clock } from 'lucide-react';
import { type PaymentMethod, type Lang } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
  lang?: Lang;
}

interface PaymentOption {
  id: PaymentMethod;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
  available: boolean;
  comingSoon: boolean;
  descriptionKey?: string;
}

const paymentOptions: PaymentOption[] = [
  {
    id: 'cod',
    labelKey: 'cashOnDelivery',
    Icon: Banknote,
    available: true,
    comingSoon: false,
  },
  {
    id: 'card',
    labelKey: 'cardPayment',
    Icon: CreditCard,
    available: false,
    comingSoon: true,
  },
  {
    id: 'wallet',
    labelKey: 'walletPayment',
    Icon: Wallet,
    available: false,
    comingSoon: true,
  },
];

export default function PaymentMethodSelector({ selected, onSelect, lang: langProp }: PaymentMethodSelectorProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--ggh-text)' }}>
        {t(lang, 'paymentMethod')}
      </h3>
      <div className="space-y-2">
        {paymentOptions.map((option) => {
          const isSelected = selected === option.id;

          return (
            <button
              key={option.id}
              onClick={() => option.available && onSelect(option.id)}
              disabled={!option.available}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all min-h-[48px] ${
                !option.available ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              style={{
                backgroundColor: isSelected ? '#E8F5E9' : '#FAFAFA',
                border: isSelected ? '2px solid var(--ggh-primary)' : '1px solid var(--ggh-border)',
              }}
              aria-pressed={isSelected}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isSelected ? 'var(--ggh-primary)' : '#F5F5F5',
                }}
              >
                <option.Icon
                  className="size-5"
                  style={{ color: isSelected ? '#FFFFFF' : 'var(--ggh-text-secondary)' }}
                />
              </div>
              <div className="flex-1 text-start">
                <span
                  className="text-sm font-semibold block"
                  style={{
                    color: isSelected ? 'var(--ggh-primary)' : 'var(--ggh-text)',
                  }}
                >
                  {t(lang, option.labelKey)}
                </span>
                {option.id === 'cod' && (
                  <span className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {lang === 'ar' ? 'ادفع عند الاستلام' : 'Pay when you receive'}
                  </span>
                )}
              </div>
              {option.comingSoon && (
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: '#FFF3E0', color: '#9A6700' }}
                >
                  <Clock className="size-3 me-1 inline" />
                  {lang === 'ar' ? 'قريباً' : 'Soon'}
                </span>
              )}
              {isSelected && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--ggh-primary)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

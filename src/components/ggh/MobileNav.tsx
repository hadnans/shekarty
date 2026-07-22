'use client';

import { Home, Grid3X3, ShoppingCart, User, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';

interface MobileNavProps {
  lang?: string;
  currentView?: string;
  onViewChange?: (view: string) => void;
  cartCount?: number;
}

const tabs = [
  { id: 'shop', labelKey: 'home', Icon: Home },
  { id: 'categories', labelKey: 'categories', Icon: Grid3X3 },
  { id: 'cart', labelKey: 'cart', Icon: ShoppingCart },
  { id: 'account', labelKey: 'account', Icon: User },
] as const;

export default function MobileNav({ currentView = 'shop', onViewChange, cartCount = 0 }: MobileNavProps) {
  const { lang } = useLangStore();

  const handleTabClick = (tabId: string) => {
    if (onViewChange) {
      onViewChange(tabId);
    }
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-white border-t"
      style={{ borderColor: 'var(--ggh-border)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const isActive = currentView === tab.id || (tab.id === 'shop' && currentView === 'shop');
          const showBadge = tab.id === 'cart' && cartCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors"
              style={{
                color: isActive ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
              }}
              aria-label={t(lang, tab.labelKey)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <tab.Icon className="size-5" />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 h-4 min-w-4 flex items-center justify-center text-[10px] font-bold text-white px-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--ggh-accent)' }}
                  >
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-tight">
                {t(lang, tab.labelKey)}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute top-0 inset-x-2 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--ggh-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

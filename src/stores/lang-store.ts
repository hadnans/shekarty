// GGH — Gomla Go Home (جملة لحد البيت)
// Language store — manages EN/AR with RTL support and persist

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Lang } from '@/types/ggh';

interface LangState {
  lang: Lang;
  isRTL: boolean;

  // Actions
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'ar', // Default to Arabic for Egyptian market
      isRTL: true,

      setLang: (lang: Lang) => {
        const isRTL = lang === 'ar';
        if (typeof document !== 'undefined') {
          document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = lang;
        }
        set({ lang, isRTL });
      },

      toggleLang: () => {
        const newLang = get().lang === 'en' ? 'ar' : 'en';
        get().setLang(newLang);
      },
    }),
    {
      name: 'ggh-lang',
    }
  )
);

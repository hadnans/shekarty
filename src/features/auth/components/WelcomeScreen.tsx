'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { type Lang, type AuthResponse } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/services/api';

interface WelcomeScreenProps {
  authResponse: AuthResponse;
  onComplete: () => void;
  lang?: Lang;
}

type WelcomeStep = 'name' | 'area' | 'done';

const AREAS_EN = [
  'Cairo - Nasr City',
  'Cairo - Heliopolis',
  'Cairo - Maadi',
  'Cairo - Zamalek',
  'Cairo - New Cairo',
  'Giza - Dokki',
  'Giza - Mohandessin',
  'Giza - 6th October',
  'Alexandria - Sidi Gaber',
  'Alexandria - Smouha',
];

const AREAS_AR = [
  'القاهرة - مدينة نصر',
  'القاهرة - مصر الجديدة',
  'القاهرة - المعادي',
  'القاهرة - الزمالك',
  'القاهرة - القاهرة الجديدة',
  'الجيزة - الدقي',
  'الجيزة - المهندسين',
  'الجيزة - 6 أكتوبر',
  'الإسكندرية - سيدى جابر',
  'الإسكندرية - سموحة',
];

export default function WelcomeScreen({ authResponse, onComplete, lang: langProp }: WelcomeScreenProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;
  const { updateProfile } = useAuthStore();

  const [step, setStep] = useState<WelcomeStep>('name');
  const [name, setName] = useState(authResponse.customer.firstName || '');
  const [area, setArea] = useState('');

  const handleNameNext = async () => {
    if (name.trim()) {
      try {
        const response = await api.updateProfile({ firstName: name.trim() });
        updateProfile({ firstName: response.data.firstName });
      } catch (err) {
        const message = err instanceof Error ? err.message : t(lang, 'errorGeneric');
        toast.error(message);
      }
    }
    setStep('area');
  };

  const handleAreaNext = () => {
    setStep('done');
  };

  const handleDone = () => {
    onComplete();
  };

  const areas = lang === 'ar' ? AREAS_AR : AREAS_EN;

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ x: isRTL ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 50 : -50, opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'welcomeNew')}
              </h2>
              <p className="text-base" style={{ color: 'var(--ggh-text-secondary)' }}>
                {t(lang, 'yourName')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-name" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'yourName')}
              </Label>
              <Input
                id="welcome-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(lang, 'yourNamePlaceholder')}
                className="h-14 text-lg rounded-xl"
                aria-label={t(lang, 'yourName')}
              />
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 h-14 text-lg font-bold rounded-xl"
                style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
                onClick={handleNameNext}
              >
                {t(lang, 'next')}
              </Button>
              <Button
                variant="ghost"
                className="h-14 px-6 text-base font-medium rounded-xl"
                style={{ color: 'var(--ggh-text-secondary)' }}
                onClick={() => setStep('area')}
              >
                {t(lang, 'skip')}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'area' && (
          <motion.div
            key="area"
            initial={{ x: isRTL ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 50 : -50, opacity: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'deliveryArea')}
              </h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-area" className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'selectArea')}
              </Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger
                  id="welcome-area"
                  className="h-14 text-lg rounded-xl"
                  aria-label={t(lang, 'selectArea')}
                >
                  <SelectValue placeholder={t(lang, 'selectArea')} />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a, i) => (
                    <SelectItem key={i} value={AREAS_EN[i]} className="text-base">
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 h-14 text-lg font-bold rounded-xl"
                style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
                onClick={handleAreaNext}
                disabled={!area}
              >
                {t(lang, 'next')}
              </Button>
              <Button
                variant="ghost"
                className="h-14 px-6 text-base font-medium rounded-xl"
                style={{ color: 'var(--ggh-text-secondary)' }}
                onClick={() => setStep('done')}
              >
                {t(lang, 'skip')}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6 text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
              {t(lang, 'welcomeNew')}
            </h2>
            <p className="text-base" style={{ color: 'var(--ggh-text-secondary)' }}>
              {t(lang, 'slogan')}
            </p>
            <Button
              className="w-full h-14 text-lg font-bold rounded-xl"
              style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
              onClick={handleDone}
            >
              {t(lang, 'letsStart')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

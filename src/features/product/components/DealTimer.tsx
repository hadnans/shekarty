'use client';

import { useState, useEffect, useRef } from 'react';
import { type Lang } from '@/types/ggh';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';

interface DealTimerProps {
  endsAt: string;
  lang?: Lang;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(endsAt: string): TimeLeft {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-lg sm:text-xl font-bold font-mono rounded-lg px-2 py-1 min-w-[36px] text-center"
        style={{ backgroundColor: color === 'amber' ? '#FFF3E0' : '#FFEBEE', color: color === 'amber' ? '#E65100' : '#CF222E' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
        {label}
      </span>
    </div>
  );
}

export default function DealTimer({ endsAt, lang: langProp }: DealTimerProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(endsAt));
  const [isExpired, setIsExpired] = useState(false);
  const endsAtRef = useRef(endsAt);

  useEffect(() => {
    endsAtRef.current = endsAt;
  }, [endsAt]);

  useEffect(() => {
    const tick = () => {
      const newTimeLeft = calcTimeLeft(endsAtRef.current);
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setIsExpired(true);
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isExpired) {
    return (
      <span className="text-sm font-medium" style={{ color: '#CF222E' }}>
        {lang === 'ar' ? 'انتهى العرض' : 'Deal expired'}
      </span>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2;
  const color = isUrgent ? 'red' : 'amber';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs sm:text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
        {t(lang, 'dealEndsIn')}
      </span>
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <TimeUnit value={timeLeft.days} label={t(lang, 'days')} color={color} />
        )}
        <TimeUnit value={timeLeft.hours} label={t(lang, 'hours')} color={color} />
        <span className="text-lg font-bold" style={{ color: isUrgent ? '#CF222E' : '#E65100' }}>:</span>
        <TimeUnit value={timeLeft.minutes} label={t(lang, 'minutes')} color={color} />
        <span className="text-lg font-bold" style={{ color: isUrgent ? '#CF222E' : '#E65100' }}>:</span>
        <TimeUnit value={timeLeft.seconds} label={t(lang, 'seconds')} color={color} />
      </div>
    </div>
  );
}

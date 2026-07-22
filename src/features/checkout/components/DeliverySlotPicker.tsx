'use client';

import { useState } from 'react';
import { Sun, CloudSun, Moon, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Lang, type DeliverySlot } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface DeliverySlotPickerProps {
  slots: DeliverySlot[];
  selectedSlot: string | null;
  onSelectSlot: (slotId: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  lang?: Lang;
}

const slotIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  morning: Sun,
  afternoon: CloudSun,
  evening: Moon,
};

function getNextDays(count: number, lang: Lang): { value: string; label: string; dayName: string }[] {
  const days: { value: string; label: string; dayName: string }[] = [];
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const value = date.toISOString().split('T')[0];
    const dayName = lang === 'ar' ? dayNamesAr[date.getDay()] : dayNamesEn[date.getDay()];
    const label = i === 0
      ? lang === 'ar' ? 'اليوم' : 'Today'
      : i === 1
      ? lang === 'ar' ? 'بكره' : 'Tomorrow'
      : `${date.getDate()}/${date.getMonth() + 1}`;
    days.push({ value, label, dayName });
  }
  return days;
}

function getSlotType(labelEn: string): string {
  if (labelEn.toLowerCase().includes('morning')) return 'morning';
  if (labelEn.toLowerCase().includes('afternoon')) return 'afternoon';
  if (labelEn.toLowerCase().includes('evening')) return 'evening';
  return 'morning';
}

export default function DeliverySlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  selectedDate,
  onSelectDate,
  lang: langProp,
}: DeliverySlotPickerProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const dates = getNextDays(5, lang);

  return (
    <div className="space-y-4">
      {/* Date selector */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--ggh-text)' }}>
          <CalendarDays className="size-4" style={{ color: 'var(--ggh-primary)' }} />
          {lang === 'ar' ? 'اختر يوم التوصيل' : 'Select delivery date'}
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => (
            <button
              key={date.value}
              onClick={() => onSelectDate(date.value)}
              className="flex flex-col items-center px-4 py-3 rounded-xl min-w-[72px] transition-all min-h-[48px]"
              style={{
                backgroundColor: selectedDate === date.value ? '#E8F5E9' : '#FAFAFA',
                border: selectedDate === date.value ? '2px solid var(--ggh-primary)' : '1px solid var(--ggh-border)',
                color: selectedDate === date.value ? 'var(--ggh-primary)' : 'var(--ggh-text)',
              }}
              aria-pressed={selectedDate === date.value}
            >
              <span className="text-xs font-medium">{date.dayName}</span>
              <span className="text-sm font-bold">{date.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time slot selector */}
      <div>
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'selectSlot')}
        </h3>
        <div className="space-y-2">
          {slots.map((slot) => {
            const slotType = getSlotType(slot.labelEn);
            const SlotIcon = slotIcons[slotType] || Sun;
            const slotLabel = lang === 'ar' ? slot.labelAr : slot.labelEn;

            return (
              <button
                key={slot.id}
                onClick={() => slot.isAvailable && onSelectSlot(slot.id)}
                disabled={!slot.isAvailable}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all min-h-[48px] ${
                  !slot.isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{
                  backgroundColor: selectedSlot === slot.id ? '#E8F5E9' : '#FAFAFA',
                  border: selectedSlot === slot.id ? '2px solid var(--ggh-primary)' : '1px solid var(--ggh-border)',
                }}
                aria-pressed={selectedSlot === slot.id}
              >
                <SlotIcon
                  className="size-5 shrink-0"
                  style={{
                    color: selectedSlot === slot.id ? 'var(--ggh-primary)' : 'var(--ggh-text-secondary)',
                  }}
                />
                <span
                  className="text-sm font-medium flex-1 text-start"
                  style={{
                    color: selectedSlot === slot.id ? 'var(--ggh-primary)' : 'var(--ggh-text)',
                  }}
                >
                  {slotLabel}
                </span>
                {!slot.isAvailable && (
                  <span className="text-xs font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {lang === 'ar' ? 'غير متاح' : 'Unavailable'}
                  </span>
                )}
                {selectedSlot === slot.id && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
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
    </div>
  );
}

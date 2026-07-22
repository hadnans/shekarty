'use client';

// GGH DriverCard — Driver information card with call button
// Shows driver name, vehicle, phone, rating in bilingual format

import { Phone, Star, Truck } from 'lucide-react';
import { type DriverInfo } from '@/lib/delivery/types';
import { type Lang } from '@/types/ggh';

interface DriverCardProps {
  driver: DriverInfo;
  lang: Lang;
}

/**
 * Displays driver info: name, vehicle, phone, rating.
 * Includes a call button (tel: link) for direct contact.
 * Bilingual labels.
 */
export default function DriverCard({ driver, lang }: DriverCardProps) {
  const name = lang === 'ar' ? driver.nameAr : driver.nameEn;
  const vehicleLabel = lang === 'ar' ? 'المركبة' : 'Vehicle';
  const callLabel = lang === 'ar' ? 'اتصل' : 'Call';

  const vehicleTypeLabels: Record<string, { en: string; ar: string }> = {
    motorcycle: { en: 'Motorcycle', ar: 'موتوسيكل' },
    car: { en: 'Car', ar: 'عربية' },
    van: { en: 'Van', ar: 'عربية نقل' },
    truck: { en: 'Truck', ar: 'لوري' },
  };

  const vt = vehicleTypeLabels[driver.vehicleType] || vehicleTypeLabels.motorcycle;

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: 'var(--ggh-card)',
        borderColor: 'var(--ggh-border)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Driver avatar placeholder */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
        >
          <Truck className="w-6 h-6" />
        </div>

        {/* Driver info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--ggh-text)' }}>
            {name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
              {lang === 'ar' ? vt.ar : vt.en}
            </span>
            {driver.vehiclePlate && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--ggh-bg-alt)', color: 'var(--ggh-text-secondary)' }}
              >
                {driver.vehiclePlate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium" style={{ color: 'var(--ggh-text)' }}>
              {driver.rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Call button */}
        <a
          href={`tel:${driver.phone}`}
          className="flex items-center justify-center w-12 h-12 rounded-full shrink-0 transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
          aria-label={`${callLabel} ${name}`}
        >
          <Phone className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}

'use client';

// GGH LiveMap — Map display with driver position
// Shows driver location on a map placeholder with route visualization

import { motion } from 'framer-motion';
import { MapPin, Navigation, Warehouse } from 'lucide-react';
import { type DriverLocation, type WarehouseInfo } from '@/lib/delivery/types';
import { type Lang } from '@/types/ggh';

interface LiveMapProps {
  driverLocation?: DriverLocation;
  warehouse?: WarehouseInfo;
  customerLocation?: { lat: number; lng: number };
  lang: Lang;
}

/**
 * Map component showing driver position, warehouse, and delivery route.
 * Uses a placeholder visualization since we don't embed a real map provider.
 * Shows driver position indicator with heading.
 */
export default function LiveMap({ driverLocation, warehouse, customerLocation, lang }: LiveMapProps) {
  const driverLabel = lang === 'ar' ? 'موقع السائق' : 'Driver Location';
  const warehouseLabel = lang === 'ar' ? 'المستودع' : 'Warehouse';
  const yourLocationLabel = lang === 'ar' ? 'موقعك' : 'Your Location';
  const lastUpdatedLabel = lang === 'ar' ? 'آخر تحديث' : 'Last updated';

  return (
    <div
      className="rounded-xl border overflow-hidden relative"
      style={{
        backgroundColor: '#E8F5E9',
        borderColor: 'var(--ggh-border)',
        minHeight: '220px',
      }}
    >
      {/* Map placeholder with grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1B5E20" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Road lines */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-amber-300/40" />
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-300/40" />
      </div>

      {/* Warehouse marker */}
      {warehouse && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
              style={{ backgroundColor: '#795548' }}
            >
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: 'var(--ggh-card)', color: 'var(--ggh-text)' }}
            >
              {warehouseLabel}
            </span>
          </div>
        </div>
      )}

      {/* Driver position */}
      {driverLocation && (
        <motion.div
          className="absolute z-20"
          style={{
            top: '45%',
            left: warehouse ? '35%' : '50%',
          }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
              style={{ backgroundColor: 'var(--ggh-primary)' }}
            >
              <Navigation
                className="w-5 h-5 text-white"
                style={{ transform: `rotate(${driverLocation.heading}deg)` }}
              />
            </div>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: 'var(--ggh-card)', color: 'var(--ggh-primary)' }}
            >
              {driverLabel}
            </span>
          </div>
        </motion.div>
      )}

      {/* Customer / destination marker */}
      {customerLocation && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: 'var(--ggh-accent)' }}
            >
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
              style={{ backgroundColor: 'var(--ggh-card)', color: 'var(--ggh-accent)' }}
            >
              {yourLocationLabel}
            </span>
          </div>
        </div>
      )}

      {/* No location message */}
      {!driverLocation && !customerLocation && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
            {lang === 'ar' ? 'موقع السائق غير متاح حالياً' : 'Driver location not available yet'}
          </p>
        </div>
      )}

      {/* Last updated indicator */}
      {driverLocation && (
        <div
          className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: 'var(--ggh-text-secondary)' }}
        >
          {lastUpdatedLabel}: {formatLastUpdated(driverLocation.lastUpdated, lang)}
        </div>
      )}
    </div>
  );
}

/**
 * Format the last updated timestamp
 */
function formatLastUpdated(isoString: string, lang: Lang): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return lang === 'ar' ? 'الآن' : 'just now';
    if (diffMin < 60) return lang === 'ar' ? `من ${diffMin} دقيقة` : `${diffMin}m ago`;

    return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

'use client';

// GGH TrackingPage — Customer-facing delivery tracking view
// Shows order status, visual timeline, driver info, live ETA, and map

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, MapPin, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { type DeliveryTracking, type DeliveryStep, STEP_LABELS, DELIVERY_STEPS_ORDER } from '@/lib/delivery/types';
import { type Lang, fromPiastres, type Piastres } from '@/types/ggh';
import DriverTimeline from './DriverTimeline';
import DriverCard from './DriverCard';
import LiveMap from './LiveMap';

interface TrackingPageProps {
  orderId: string;
  lang: Lang;
  onBack?: () => void;
}

/**
 * Customer-facing tracking page.
 * Polls for tracking updates every 30 seconds.
 * Shows order number, current status, visual timeline, driver info, live ETA, and map.
 */
export default function TrackingPage({ orderId, lang, onBack }: TrackingPageProps) {
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRTL = lang === 'ar';

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/delivery/track/${orderId}`);
      if (!res.ok) {
        throw new Error(lang === 'ar' ? 'لم يتم العثور على الطلب' : 'Order not found');
      }
      const json = await res.json();
      setTracking(json.data as DeliveryTracking);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tracking');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, lang]);

  // Initial fetch and polling
  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchTracking]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--ggh-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
              {lang === 'ar' ? 'جاري تحميل بيانات التتبع...' : 'Loading tracking data...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tracking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div
          className="rounded-xl p-6 text-center border"
          style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
        >
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ggh-text-secondary)' }} />
          <p className="font-medium" style={{ color: 'var(--ggh-text)' }}>
            {error || (lang === 'ar' ? 'لم يتم العثور على الطلب' : 'Order not found')}
          </p>
          <button
            onClick={fetchTracking}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
          >
            {lang === 'ar' ? 'حاول تاني' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const currentStepLabel = lang === 'ar'
    ? STEP_LABELS[tracking.currentStep]?.ar || tracking.currentStep
    : STEP_LABELS[tracking.currentStep]?.en || tracking.currentStep;

  const isFailed = tracking.currentStep === 'delivery_failed';
  const isCancelled = tracking.currentStep === 'cancelled';
  const isDelivered = tracking.currentStep === 'delivered';

  // Status color
  let statusColor = 'var(--ggh-primary)';
  if (isFailed || isCancelled) statusColor = '#DC2626';
  if (isDelivered) statusColor = 'var(--ggh-primary)';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            aria-label={lang === 'ar' ? 'رجوع' : 'Back'}
          >
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: 'var(--ggh-text)' }}>
            {lang === 'ar' ? 'تتبع الطلب' : 'Track Order'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
            {tracking.orderNumber}
          </p>
        </div>
        <button
          onClick={fetchTracking}
          className="p-2 rounded-lg transition-colors hover:bg-gray-100"
          aria-label={lang === 'ar' ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className="w-5 h-5" style={{ color: 'var(--ggh-text-secondary)' }} />
        </button>
      </div>

      {/* Current Status Banner */}
      <motion.div
        className="rounded-xl p-4 mb-6 border"
        style={{
          backgroundColor: isDelivered ? '#E8F5E9' : isFailed || isCancelled ? '#FEF2F2' : 'var(--ggh-card)',
          borderColor: statusColor,
          borderWidth: '2px',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: statusColor }}
          >
            {isDelivered ? (
              <Package className="w-5 h-5 text-white" />
            ) : isFailed || isCancelled ? (
              <Package className="w-5 h-5 text-white" />
            ) : (
              <Clock className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: statusColor }}>
              {currentStepLabel}
            </p>
            {tracking.estimatedDeliveryTime && !isDelivered && !isCancelled && !isFailed && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
                <Clock className="w-3 h-3 inline mr-1" />
                {lang === 'ar' ? 'التوصيل المتوقع: ' : 'Est. delivery: '}
                {formatETA(tracking.estimatedDeliveryTime, lang)}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Map */}
      <div className="mb-6">
        <LiveMap
          driverLocation={tracking.driverLocation}
          warehouse={tracking.warehouse}
          customerLocation={tracking.customerLocation}
          lang={lang}
        />
      </div>

      {/* Driver Card */}
      <AnimatePresence>
        {tracking.driver && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--ggh-text)' }}>
              {lang === 'ar' ? 'السائق' : 'Your Driver'}
            </h2>
            <DriverCard driver={tracking.driver} lang={lang} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <motion.div
        className="rounded-xl p-5 border"
        style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--ggh-text)' }}>
          {lang === 'ar' ? 'خطوات التوصيل' : 'Delivery Steps'}
        </h2>
        <DriverTimeline
          steps={tracking.steps}
          currentStep={tracking.currentStep}
          lang={lang}
          isFailed={isFailed}
          isCancelled={isCancelled}
        />
      </motion.div>

      {/* Warehouse info */}
      {tracking.warehouse && (
        <motion.div
          className="rounded-xl p-4 mt-4 border"
          style={{ backgroundColor: 'var(--ggh-card)', borderColor: 'var(--ggh-border)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: 'var(--ggh-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--ggh-text)' }}>
              {lang === 'ar' ? tracking.warehouse.nameAr : tracking.warehouse.nameEn}
            </p>
          </div>
          <p className="text-xs mt-1 ml-6" style={{ color: 'var(--ggh-text-secondary)' }}>
            {tracking.warehouse.address}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Format ETA time for display
 */
function formatETA(isoString: string, lang: Lang): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

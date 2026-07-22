'use client';

// GGH DriverTimeline — Visual delivery timeline component
// Shows delivery steps with icons, bilingual labels, and completion status

import { motion } from 'framer-motion';
import {
  Package, CheckCircle2, Truck, MapPin, Phone, AlertCircle, XCircle,
  Clock, Warehouse, UserCheck, Navigation,
} from 'lucide-react';
import { type DeliveryStep, type DeliveryStepTimeline, STEP_LABELS, DELIVERY_STEPS_ORDER } from '@/lib/delivery/types';
import { type Lang } from '@/types/ggh';

interface DriverTimelineProps {
  steps: DeliveryStepTimeline[];
  currentStep: DeliveryStep;
  lang: Lang;
  isFailed?: boolean;
  isCancelled?: boolean;
}

/** Map delivery steps to icons */
const STEP_ICONS: Record<DeliveryStep, React.ElementType> = {
  order_placed: Package,
  order_confirmed: CheckCircle2,
  being_packed: Warehouse,
  ready_for_pickup: Package,
  driver_assigned: UserCheck,
  driver_en_route: Navigation,
  driver_arrived_pickup: MapPin,
  picked_up: Truck,
  driver_en_route_delivery: Truck,
  driver_arrived_delivery: MapPin,
  delivered: CheckCircle2,
  delivery_failed: AlertCircle,
  cancelled: XCircle,
};

/**
 * Visual timeline showing all delivery steps with completion status.
 * Active step is highlighted with animation. Cancelled state shows red X.
 */
export default function DriverTimeline({ steps, currentStep, lang, isFailed, isCancelled }: DriverTimelineProps) {
  const currentIdx = DELIVERY_STEPS_ORDER.indexOf(currentStep);

  return (
    <div className="relative" role="list" aria-label={lang === 'ar' ? 'خطوات التوصيل' : 'Delivery steps'}>
      {/* Vertical line connecting steps */}
      <div
        className="absolute top-0 bottom-0 w-0.5"
        style={{
          [lang === 'ar' ? 'right' : 'left']: '19px',
          backgroundColor: 'var(--ggh-border)',
        }}
      />

      <div className="space-y-1">
        {steps.map((step, idx) => {
          const isCompleted = step.completedAt !== null || idx < currentIdx;
          const isCurrent = step.isCurrent;
          const Icon = STEP_ICONS[step.step] || Clock;
          const isFailedStep = isFailed && step.step === 'delivery_failed';
          const isCancelledStep = isCancelled && step.step === 'cancelled';

          // Determine colors
          let iconBg = 'var(--ggh-border)';
          let iconColor = 'var(--ggh-text-secondary)';
          let textColor = 'var(--ggh-text-secondary)';

          if (isCompleted) {
            iconBg = 'var(--ggh-primary)';
            iconColor = '#FFFFFF';
            textColor = 'var(--ggh-text)';
          }
          if (isCurrent) {
            iconBg = 'var(--ggh-primary)';
            iconColor = '#FFFFFF';
            textColor = 'var(--ggh-primary)';
          }
          if (isFailedStep || isCancelledStep) {
            iconBg = '#DC2626';
            iconColor = '#FFFFFF';
            textColor = '#DC2626';
          }

          const label = lang === 'ar' ? step.labelAr : step.labelEn;
          const description = lang === 'ar' ? step.descriptionAr : step.descriptionEn;

          return (
            <div
              key={step.step}
              className="relative flex items-start gap-3 pb-4"
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Icon circle */}
              <motion.div
                className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                style={{ backgroundColor: iconBg }}
                initial={isCurrent ? { scale: 0.8 } : undefined}
                animate={isCurrent ? { scale: [0.9, 1.05, 1] } : undefined}
                transition={isCurrent ? { duration: 1.5, repeat: Infinity, repeatType: 'reverse' } : undefined}
              >
                <Icon className="w-5 h-5" style={{ color: iconColor }} />
              </motion.div>

              {/* Label and description */}
              <div className="pt-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: textColor }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
                  {description}
                </p>
                {step.completedAt && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ggh-text-secondary)' }}>
                    {formatTimestamp(step.completedAt, lang)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format an ISO timestamp for display
 */
function formatTimestamp(isoString: string, lang: Lang): string {
  try {
    const date = new Date(isoString);
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

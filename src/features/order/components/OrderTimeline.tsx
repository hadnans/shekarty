'use client';

import { CheckCircle, Circle, Clock, Package, Truck, ShoppingBag, XCircle } from 'lucide-react';
import { type Lang, type OrderStatus, type OrderStatusHistory } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  statusHistory: OrderStatusHistory[];
  lang?: Lang;
}

interface TimelineStep {
  status: OrderStatus;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const timelineSteps: TimelineStep[] = [
  { status: 'pending', labelKey: 'pending', Icon: Clock },
  { status: 'confirmed', labelKey: 'confirmed', Icon: CheckCircle },
  { status: 'processing', labelKey: 'processing', Icon: Package },
  { status: 'packed', labelKey: 'packed', Icon: ShoppingBag },
  { status: 'out_for_delivery', labelKey: 'outForDelivery', Icon: Truck },
  { status: 'delivered', labelKey: 'delivered', Icon: CheckCircle },
];

function getStepState(
  stepStatus: OrderStatus,
  currentStatus: OrderStatus,
  statusHistory: OrderStatusHistory[]
): 'done' | 'current' | 'upcoming' | 'cancelled' {
  const currentIdx = timelineSteps.findIndex((s) => s.status === currentStatus);
  const stepIdx = timelineSteps.findIndex((s) => s.status === stepStatus);

  if (currentStatus === 'cancelled' || currentStatus === 'returned') {
    return stepStatus === currentStatus ? 'cancelled' : stepIdx < currentIdx ? 'done' : 'upcoming';
  }

  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'upcoming';
}

export default function OrderTimeline({ currentStatus, statusHistory, lang: langProp }: OrderTimelineProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  const getTimestamp = (status: OrderStatus): string | null => {
    const entry = statusHistory.find((h) => h.status === status);
    return entry?.createdAt || null;
  };

  const formatTimestamp = (ts: string): string => {
    const date = new Date(ts);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-0">
      {timelineSteps.map((step, index) => {
        const state = getStepState(step.status, currentStatus, statusHistory);
        const StepIcon = step.Icon;
        const timestamp = getTimestamp(step.status);
        const isLast = index === timelineSteps.length - 1;

        let iconColor = '#E0E0E0';
        let textColor = 'var(--ggh-text-secondary)';
        let lineColor = '#E0E0E0';
        let bgColor = '#F5F5F5';

        if (state === 'done') {
          iconColor = '#FFFFFF';
          textColor = 'var(--ggh-text)';
          lineColor = 'var(--ggh-primary)';
          bgColor = 'var(--ggh-primary)';
        } else if (state === 'current') {
          iconColor = 'var(--ggh-primary)';
          textColor = 'var(--ggh-primary)';
          lineColor = '#E0E0E0';
          bgColor = '#E8F5E9';
        } else if (state === 'cancelled') {
          iconColor = '#FFFFFF';
          textColor = '#CF222E';
          lineColor = '#CF222E';
          bgColor = '#CF222E';
        }

        return (
          <div key={step.status} className="flex gap-3">
            {/* Vertical line + icon */}
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: bgColor }}
              >
                {state === 'done' ? (
                  <CheckCircle className="size-5" style={{ color: iconColor }} />
                ) : state === 'cancelled' ? (
                  <XCircle className="size-5" style={{ color: iconColor }} />
                ) : (
                  <StepIcon className="size-5" style={{ color: iconColor }} />
                )}
              </div>
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[24px]"
                  style={{ backgroundColor: lineColor }}
                />
              )}
            </div>

            {/* Text content */}
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p className="text-sm font-semibold" style={{ color: textColor }}>
                {t(lang, step.labelKey)}
              </p>
              {timestamp && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--ggh-text-secondary)' }}>
                  {formatTimestamp(timestamp)}
                </p>
              )}
              {state === 'current' && currentStatus !== 'delivered' && (
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--ggh-accent)' }}>
                  {lang === 'ar' ? 'حالي' : 'Current'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

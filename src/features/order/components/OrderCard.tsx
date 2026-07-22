'use client';

import { ChevronRight, ChevronLeft, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Order, type OrderStatus, type Lang, type Piastres, formatPriceWithCurrency } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface OrderCardProps {
  order: Order;
  onClick?: (orderId: string) => void;
  lang?: Lang;
}

const statusColors: Record<OrderStatus, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: '#9A6700' },
  confirmed: { bg: '#E3F2FD', text: '#1565C0' },
  processing: { bg: '#E8F5E9', text: '#1B6820' },
  packed: { bg: '#E8F5E9', text: '#1B6820' },
  out_for_delivery: { bg: '#E3F2FD', text: '#1565C0' },
  delivered: { bg: '#E8F5E9', text: '#1A7F37' },
  cancelled: { bg: '#FFEBEE', text: '#CF222E' },
  returned: { bg: '#FFEBEE', text: '#CF222E' },
};

export default function OrderCard({ order, onClick, lang: langProp }: OrderCardProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;

  const statusLabel = t(lang, order.status);
  const statusStyle = statusColors[order.status] || statusColors.pending;
  const itemCount = order.items?.length || 0;
  const dateLabel = new Date(order.createdAt).toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-EG',
    { day: 'numeric', month: 'short', year: 'numeric' }
  );

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <button
      className="w-full text-start p-4 rounded-xl transition-all hover:shadow-sm"
      style={{ backgroundColor: '#FAFAFA', border: '1px solid var(--ggh-border)' }}
      onClick={() => onClick?.(order.id)}
      aria-label={`${t(lang, 'orderDetails')} #${order.orderNumber}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Order icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <Package className="size-5" style={{ color: 'var(--ggh-text-secondary)' }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Order number + date */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: 'var(--ggh-text)' }}>
                #{order.orderNumber}
              </span>
              <span className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
                {dateLabel}
              </span>
            </div>

            {/* Item count */}
            <p className="text-xs" style={{ color: 'var(--ggh-text-secondary)' }}>
              {itemCount} {t(lang, 'items')}
            </p>

            {/* Status + Total */}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                className="text-xs font-semibold px-2 py-0.5 border-0"
                style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
              >
                {statusLabel}
              </Badge>
              <span className="text-sm font-bold" style={{ color: 'var(--ggh-primary)' }}>
                {formatPriceWithCurrency(order.totalAmount, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ArrowIcon className="size-5 shrink-0 mt-1" style={{ color: 'var(--ggh-text-secondary)' }} />
      </div>
    </button>
  );
}

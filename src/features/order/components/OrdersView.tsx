'use client';

import { Package, MapPin } from 'lucide-react';
import { type Lang, type Order } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import OrderCard from '@/features/order/components/OrderCard';

interface OrdersViewProps {
  lang: Lang;
  orders: Order[];
  onTrackOrder?: (orderId: string) => void;
}

export default function OrdersView({ lang, orders, onTrackOrder }: OrdersViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Package className="size-6" style={{ color: 'var(--ggh-primary)' }} />
        <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
          {t(lang, 'myOrders')}
        </h2>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="size-16 mx-auto mb-4" style={{ color: '#E0E0E0' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, 'noOrders')}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--ggh-text-secondary)' }}>
            {t(lang, 'searchHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="relative">
              <OrderCard order={order} lang={lang} />
              {/* Track Order button for active orders */}
              {onTrackOrder && !['delivered', 'cancelled', 'returned'].includes(order.status) && (
                <button
                  onClick={() => onTrackOrder(order.id)}
                  className="absolute top-3 right-3 rtl:right-auto rtl:left-3 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
                  aria-label={t(lang, 'trackOrder')}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {t(lang, 'trackOrder')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { motion } from 'framer-motion';
import { CheckCircle, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Lang, type Order } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';

interface OrderSuccessProps {
  order: Order;
  onContinueShopping: () => void;
  onTrackOrder?: () => void;
  lang?: Lang;
}

export default function OrderSuccess({ order, onContinueShopping, onTrackOrder, lang: langProp }: OrderSuccessProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;

  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <CheckCircle className="size-20 mb-4" style={{ color: 'var(--ggh-primary)' }} />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold mb-2"
        style={{ color: 'var(--ggh-text)' }}
      >
        {t(lang, 'orderPlaced')}
      </motion.h2>

      {/* Confirmation */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-base mb-6"
        style={{ color: 'var(--ggh-text-secondary)' }}
      >
        {t(lang, 'orderConfirmed')}
      </motion.p>

      {/* Order number */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-4 rounded-xl mb-6 w-full max-w-sm"
        style={{ backgroundColor: '#FAFAFA', border: '1px solid var(--ggh-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
          {t(lang, 'orderNumber')}
        </p>
        <p className="text-xl font-bold mt-1" style={{ color: 'var(--ggh-primary)' }}>
          #{order.orderNumber}
        </p>
      </motion.div>

      {/* Estimated delivery */}
      {order.deliveryDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 mb-6"
        >
          <Truck className="size-4" style={{ color: 'var(--ggh-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--ggh-text)' }}>
            {t(lang, 'estimatedDelivery')}: {new Date(order.deliveryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
          </span>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {onTrackOrder && (
          <Button
            className="w-full h-14 text-base font-bold rounded-xl"
            style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
            onClick={onTrackOrder}
          >
            <Truck className="size-5 me-2" />
            {t(lang, 'trackOrder')}
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full h-14 text-base font-medium rounded-xl"
          style={{ borderColor: 'var(--ggh-primary)', color: 'var(--ggh-primary)' }}
          onClick={onContinueShopping}
        >
          <ShoppingBag className="size-5 me-2" />
          {t(lang, 'continueShopping')}
        </Button>
      </motion.div>
    </div>
  );
}

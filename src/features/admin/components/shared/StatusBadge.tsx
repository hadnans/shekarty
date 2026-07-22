'use client';

import { Badge } from '@/components/ui/badge';
import { type Lang } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';

// ============================================
// STATUS COLOR CONFIG
// ============================================

type StatusType = 'order' | 'payment' | 'stock' | 'deal';

const statusColors: Record<string, string> = {
  // Order statuses — per design spec
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  packed: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  out_for_delivery: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  returned: 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300',

  // Payment statuses
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300',

  // Stock statuses — ok=green, low=yellow, out=red
  ok: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  low: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',

  // Product statuses
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300',

  // Deal statuses
  timer_active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  timer_expired: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',

  // Customer statuses
  retail: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  wholesale: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  vip: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',

  // Verified
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  not_verified: 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300',
};

// ============================================
// STATUS LABEL KEY MAP
// ============================================
const statusLabelKeys: Record<string, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  processing: 'processing',
  packed: 'packed',
  out_for_delivery: 'outForDelivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'returned',
  paid: 'adminPaid',
  failed: 'adminFailed',
  refunded: 'adminRefunded',
  ok: 'adminFilterOk',
  low: 'adminFilterLowStock',
  critical: 'adminFilterCritical',
  out_of_stock: 'outOfStock',
  active: 'adminActive',
  inactive: 'adminInactive',
  timer_active: 'adminTimerActive',
  timer_expired: 'adminTimerExpired',
  retail: 'adminRetailCustomer',
  wholesale: 'adminWholesaleCustomer',
  vip: 'adminVIPCustomer',
  verified: 'adminVerified',
  not_verified: 'adminNotVerified',
};

// ============================================
// COMPONENT
// ============================================

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  lang: Lang;
  className?: string;
}

export default function StatusBadge({ status, lang, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300';
  const labelKey = statusLabelKeys[status] || status;
  const label = t(lang, labelKey);

  return (
    <Badge
      variant="outline"
      className={`${colorClass} border-transparent text-xs font-medium shrink-0 ${className || ''}`}
    >
      {label}
    </Badge>
  );
}

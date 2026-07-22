// GGH Loyalty — Tier definitions
// Retail → Wholesale → VIP progression
// Maps to Customer.wholesaleStatus

import { type TierConfig } from './types';
import {
  VIP_EARN_MULTIPLIER,
  WHOLESALE_EARN_MULTIPLIER,
} from './config';

// ============================================
// TIER DEFINITIONS
// ============================================

/** Ordered tier definitions from lowest to highest */
export const LOYALTY_TIERS: TierConfig[] = [
  {
    name: 'retail',
    nameEn: 'Retail',
    nameAr: 'تجزئة',
    wholesaleStatus: 'retail',
    minPoints: 0,
    earnMultiplier: 1.0,
    benefitsEn: 'Standard earn rate, 1 point per EGP spent',
    benefitsAr: 'معدل earning عادي، 1 نقطة لكل جنيه',
    color: '#06b6d4', // cyan
    icon: 'User',
  },
  {
    name: 'wholesale',
    nameEn: 'Wholesale',
    nameAr: 'جملة',
    wholesaleStatus: 'wholesale',
    minPoints: 500,
    earnMultiplier: WHOLESALE_EARN_MULTIPLIER,
    benefitsEn: '1.5x earn rate, wholesale pricing, priority delivery',
    benefitsAr: 'معدل earning 1.5x، تسعير جملة، توصيل مفضل',
    color: '#f59e0b', // amber
    icon: 'Building2',
  },
  {
    name: 'vip',
    nameEn: 'VIP',
    nameAr: 'VIP',
    wholesaleStatus: 'vip',
    minPoints: 2000,
    earnMultiplier: VIP_EARN_MULTIPLIER,
    benefitsEn: '2x earn rate, exclusive deals, free delivery, early access',
    benefitsAr: 'معدل earning 2x، عروض حصرية، توصيل مجاني، وصول مبكر',
    color: '#8b5cf6', // purple
    icon: 'Crown',
  },
];

// ============================================
// TIER UTILITY FUNCTIONS
// ============================================

/**
 * Get tier config by wholesale status name
 */
export function getTierByStatus(wholesaleStatus: string): TierConfig {
  return LOYALTY_TIERS.find((t) => t.wholesaleStatus === wholesaleStatus) ?? LOYALTY_TIERS[0];
}

/**
 * Get tier config by lifetime points total
 * Returns the highest tier the customer qualifies for
 */
export function getTierByPoints(lifetimePoints: number): TierConfig {
  // Iterate from highest to lowest, return first qualifying tier
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (lifetimePoints >= LOYALTY_TIERS[i].minPoints) {
      return LOYALTY_TIERS[i];
    }
  }
  return LOYALTY_TIERS[0];
}

/**
 * Get the next tier above the current one (for progress display)
 */
export function getNextTier(currentTierName: string): TierConfig | null {
  const currentIndex = LOYALTY_TIERS.findIndex((t) => t.name === currentTierName);
  if (currentIndex < 0 || currentIndex >= LOYALTY_TIERS.length - 1) {
    return null;
  }
  return LOYALTY_TIERS[currentIndex + 1];
}

/**
 * Calculate points remaining to reach the next tier
 */
export function pointsToNextTier(currentPoints: number, currentTierName: string): number {
  const nextTier = getNextTier(currentTierName);
  if (!nextTier) return 0; // Already at max tier
  return nextTier.minPoints - currentPoints;
}

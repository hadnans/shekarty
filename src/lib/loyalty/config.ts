// GGH Loyalty — Program Configuration
// Default settings and constants for the loyalty program system

/** Default earn rate: 1 point per 100 piastres (EGP 1.00) spent */
export const DEFAULT_POINTS_PER_PIASTRE = 0.01;

/** Default points value in piastres (100 piastres = EGP 1.00 per point) */
export const DEFAULT_POINTS_VALUE = 100;

/** Default minimum redemption threshold in points */
export const DEFAULT_MIN_REDEMPTION = 100;

/** Maximum points accumulation cap (null = no cap) */
export const DEFAULT_MAX_ACCUMULATION: number | null = null;

/** Points expiration period in months (0 = never expire) */
export const POINTS_EXPIRATION_MONTHS = 12;

/** Maximum daily earn transactions per customer */
export const MAX_DAILY_EARN_TRANSACTIONS = 50;

/** Maximum daily redemption attempts per customer */
export const MAX_DAILY_REDEMPTIONS = 5;

/** Bonus points awarded on first order */
export const FIRST_ORDER_BONUS_POINTS = 50;

/** Bonus multiplier for VIP customers */
export const VIP_EARN_MULTIPLIER = 2.0;

/** Bonus multiplier for wholesale customers */
export const WHOLESALE_EARN_MULTIPLIER = 1.5;

/** All valid transaction types */
export const TRANSACTION_TYPES = [
  'earn',
  'redeem',
  'bonus',
  'expire',
  'adjust',
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** All valid program types */
export const PROGRAM_TYPES = [
  'points',
  'cashback',
  'tiered',
] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

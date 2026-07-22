// GGH Loyalty — Type definitions for the loyalty program system
// Money values are integer piastres (EGP 14.50 = 1450)

import { type Piastres } from '@/types/ggh';
import { type TransactionType, type ProgramType } from './config';

// ============================================
// LOYALTY PROGRAM
// ============================================

export interface LoyaltyProgramConfig {
  id: string;
  nameEn: string;
  nameAr: string;
  type: ProgramType;
  pointsPerPiastre: number;
  pointsValue: Piastres;
  minRedemption: number;
  maxAccumulation: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// LOYALTY TRANSACTION
// ============================================

export interface PointsTransaction {
  id: string;
  customerId: string;
  programId: string;
  orderId: string | null;
  points: number;
  type: TransactionType;
  descriptionEn: string;
  descriptionAr: string;
  expiresAt: string | null;
  createdAt: string;
}

// ============================================
// TIER CONFIGURATION
// ============================================

export interface TierConfig {
  name: string;
  nameEn: string;
  nameAr: string;
  /** Wholesale status that corresponds to this tier */
  wholesaleStatus: 'retail' | 'wholesale' | 'vip';
  /** Minimum lifetime points required to reach this tier */
  minPoints: number;
  /** Points earn multiplier for this tier */
  earnMultiplier: number;
  /** Benefits description */
  benefitsEn: string;
  benefitsAr: string;
  /** Color for UI display */
  color: string;
  /** Icon name for UI display */
  icon: string;
}

// ============================================
// REWARD CONFIGURATION
// ============================================

export interface RewardConfig {
  id: string;
  nameEn: string;
  nameAr: string;
  /** Points required to redeem this reward */
  pointsRequired: number;
  /** Value of the reward in piastres */
  valueInPiastres: Piastres;
  /** Type of reward: discount, free_product, cashback */
  type: 'discount' | 'free_product' | 'cashback';
  /** Maximum times a customer can redeem this reward */
  maxPerCustomer: number | null;
  isActive: boolean;
}

// ============================================
// LOYALTY ACCOUNT (customer-facing summary)
// ============================================

export interface LoyaltyAccount {
  customerId: string;
  programId: string;
  programNameEn: string;
  programNameAr: string;
  currentPoints: number;
  lifetimePoints: number;
  currentTier: TierConfig;
  pendingPoints: number;
  availableForRedemption: number;
  nextTier: TierConfig | null;
  pointsToNextTier: number;
  recentTransactions: PointsTransaction[];
}

// ============================================
// API INPUT TYPES
// ============================================

export interface CreateProgramInput {
  nameEn: string;
  nameAr: string;
  type: ProgramType;
  pointsPerPiastre?: number;
  pointsValue?: Piastres;
  minRedemption?: number;
  maxAccumulation?: number | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdateProgramInput {
  nameEn?: string;
  nameAr?: string;
  type?: ProgramType;
  pointsPerPiastre?: number;
  pointsValue?: Piastres;
  minRedemption?: number;
  maxAccumulation?: number | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface EarnPointsInput {
  customerId: string;
  programId: string;
  orderId: string;
  amountInPiastres: Piastres;
  descriptionEn?: string;
  descriptionAr?: string;
}

export interface RedeemPointsInput {
  customerId: string;
  programId: string;
  points: number;
  descriptionEn?: string;
  descriptionAr?: string;
  orderId?: string;
}

export interface BalanceCheckResult {
  customerId: string;
  programId: string;
  currentPoints: number;
  lifetimePoints: number;
  availableForRedemption: number;
  pendingExpiration: number;
  tier: string;
}

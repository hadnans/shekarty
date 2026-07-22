// GGH Loyalty System — Barrel exports

// Configuration
export {
  DEFAULT_POINTS_PER_PIASTRE,
  DEFAULT_POINTS_VALUE,
  DEFAULT_MIN_REDEMPTION,
  DEFAULT_MAX_ACCUMULATION,
  POINTS_EXPIRATION_MONTHS,
  MAX_DAILY_EARN_TRANSACTIONS,
  MAX_DAILY_REDEMPTIONS,
  FIRST_ORDER_BONUS_POINTS,
  VIP_EARN_MULTIPLIER,
  WHOLESALE_EARN_MULTIPLIER,
  TRANSACTION_TYPES,
  PROGRAM_TYPES,
  type TransactionType,
  type ProgramType,
} from './config';

// Types
export {
  type LoyaltyProgramConfig,
  type PointsTransaction,
  type TierConfig,
  type RewardConfig,
  type LoyaltyAccount,
  type CreateProgramInput,
  type UpdateProgramInput,
  type EarnPointsInput,
  type RedeemPointsInput,
  type BalanceCheckResult,
} from './types';

// Tiers
export {
  LOYALTY_TIERS,
  getTierByStatus,
  getTierByPoints,
  getNextTier,
  pointsToNextTier,
} from './tiers';

// Service
export {
  createProgram,
  updateProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  earnPoints,
  redeemPoints,
  checkBalance,
  expireOldPoints,
  calculateEarn,
  listTransactions,
} from './service';

// GGH Loyalty — LoyaltyService
// Core business logic: earn, redeem, balance, calculate, expire

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@/lib/errors';
import {
  DEFAULT_POINTS_PER_PIASTRE,
  DEFAULT_POINTS_VALUE,
  DEFAULT_MIN_REDEMPTION,
  POINTS_EXPIRATION_MONTHS,
  FIRST_ORDER_BONUS_POINTS,
} from './config';
import {
  type LoyaltyProgramConfig,
  type PointsTransaction,
  type EarnPointsInput,
  type RedeemPointsInput,
  type BalanceCheckResult,
  type CreateProgramInput,
  type UpdateProgramInput,
  type ProgramType,
} from './types';
import { getTierByStatus, getTierByPoints } from './tiers';

const logger = createLogger('loyalty-service');

// ============================================
// PROGRAM MANAGEMENT
// ============================================

/**
 * Create a new loyalty program
 */
export async function createProgram(input: CreateProgramInput): Promise<LoyaltyProgramConfig> {
  const program = await db.loyaltyProgram.create({
    data: {
      nameEn: input.nameEn,
      nameAr: input.nameAr ?? '',
      type: input.type,
      pointsPerPiastre: input.pointsPerPiastre ?? DEFAULT_POINTS_PER_PIASTRE,
      pointsValue: input.pointsValue ?? DEFAULT_POINTS_VALUE as number,
      minRedemption: input.minRedemption ?? DEFAULT_MIN_REDEMPTION,
      maxAccumulation: input.maxAccumulation ?? null,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    },
  });

  logger.info('Loyalty program created', { programId: program.id, nameEn: program.nameEn });

  return mapProgramToConfig(program);
}

/**
 * Update an existing loyalty program
 */
export async function updateProgram(id: string, input: UpdateProgramInput): Promise<LoyaltyProgramConfig> {
  const existing = await db.loyaltyProgram.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Loyalty program not found', 'PROGRAM_NOT_FOUND');
  }

  const data: Record<string, unknown> = {};
  if (input.nameEn !== undefined) data.nameEn = input.nameEn;
  if (input.nameAr !== undefined) data.nameAr = input.nameAr;
  if (input.type !== undefined) data.type = input.type;
  if (input.pointsPerPiastre !== undefined) data.pointsPerPiastre = input.pointsPerPiastre;
  if (input.pointsValue !== undefined) data.pointsValue = input.pointsValue;
  if (input.minRedemption !== undefined) data.minRedemption = input.minRedemption;
  if (input.maxAccumulation !== undefined) data.maxAccumulation = input.maxAccumulation;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt ? new Date(input.endsAt) : null;

  const program = await db.loyaltyProgram.update({
    where: { id },
    data,
  });

  logger.info('Loyalty program updated', { programId: id });

  return mapProgramToConfig(program);
}

/**
 * Delete a loyalty program (only if no transactions exist)
 */
export async function deleteProgram(id: string): Promise<void> {
  const transactionCount = await db.loyaltyTransaction.count({
    where: { programId: id },
  });

  if (transactionCount > 0) {
    throw new ConflictError(
      'Cannot delete program with existing transactions',
      'PROGRAM_HAS_TRANSACTIONS'
    );
  }

  await db.loyaltyProgram.delete({ where: { id } });
  logger.info('Loyalty program deleted', { programId: id });
}

/**
 * Get a loyalty program by ID
 */
export async function getProgram(id: string): Promise<LoyaltyProgramConfig> {
  const program = await db.loyaltyProgram.findUnique({ where: { id } });
  if (!program) {
    throw new NotFoundError('Loyalty program not found', 'PROGRAM_NOT_FOUND');
  }
  return mapProgramToConfig(program);
}

/**
 * List all loyalty programs with optional filters
 */
export async function listPrograms(
  page: number = 1,
  limit: number = 20,
  isActive?: boolean,
  type?: ProgramType
): Promise<{ programs: LoyaltyProgramConfig[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (isActive !== undefined) where.isActive = isActive;
  if (type !== undefined) where.type = type;

  const [programs, total] = await Promise.all([
    db.loyaltyProgram.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.loyaltyProgram.count({ where }),
  ]);

  return {
    programs: programs.map(mapProgramToConfig),
    total,
  };
}

// ============================================
// EARN POINTS
// ============================================

/**
 * Calculate the number of points a customer earns for a given spend amount.
 * Applies tier multiplier based on customer's wholesale status.
 */
export function calculateEarn(
  amountInPiastres: number,
  pointsPerPiastre: number,
  wholesaleStatus: string
): number {
  const tier = getTierByStatus(wholesaleStatus);
  const basePoints = Math.round(amountInPiastres * pointsPerPiastre);
  return Math.round(basePoints * tier.earnMultiplier);
}

/**
 * Award points to a customer for a purchase.
 * Creates an earn transaction and optionally a first-order bonus.
 */
export async function earnPoints(input: EarnPointsInput): Promise<PointsTransaction> {
  // Validate program exists and is active
  const program = await db.loyaltyProgram.findUnique({ where: { id: input.programId } });
  if (!program || !program.isActive) {
    throw new NotFoundError('Loyalty program not found or inactive', 'PROGRAM_NOT_FOUND');
  }

  // Get customer's wholesale status for tier multiplier
  const customer = await db.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) {
    throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  // Calculate earned points with tier multiplier
  const earnedPoints = calculateEarn(
    input.amountInPiastres,
    program.pointsPerPiastre,
    customer.wholesaleStatus
  );

  if (earnedPoints <= 0) {
    throw new ValidationError('Earned points must be positive', 'INVALID_EARN_POINTS');
  }

  // Check max accumulation cap
  if (program.maxAccumulation) {
    const currentBalance = await getCustomerPointsBalance(input.customerId, input.programId);
    if (currentBalance + earnedPoints > program.maxAccumulation) {
      throw new ConflictError(
        'Maximum accumulation cap reached',
        'MAX_ACCUMULATION_REACHED'
      );
    }
  }

  // Set expiration date if configured
  const expiresAt = POINTS_EXPIRATION_MONTHS > 0
    ? new Date(Date.now() + POINTS_EXPIRATION_MONTHS * 30 * 24 * 60 * 60 * 1000)
    : null;

  // Create earn transaction
  const transaction = await db.loyaltyTransaction.create({
    data: {
      customerId: input.customerId,
      programId: input.programId,
      orderId: input.orderId,
      points: earnedPoints,
      type: 'earn',
      descriptionEn: input.descriptionEn ?? `Earned ${earnedPoints} points from order`,
      descriptionAr: input.descriptionAr ?? `تم ربح ${earnedPoints} نقاط من الطلب`,
      expiresAt,
    },
  });

  // Check if this is the customer's first order → award bonus
  const orderCount = await db.order.count({
    where: { customerId: input.customerId, deletedAt: null },
  });

  if (orderCount === 1 && FIRST_ORDER_BONUS_POINTS > 0) {
    await db.loyaltyTransaction.create({
      data: {
        customerId: input.customerId,
        programId: input.programId,
        orderId: input.orderId,
        points: FIRST_ORDER_BONUS_POINTS,
        type: 'bonus',
        descriptionEn: `First order bonus: ${FIRST_ORDER_BONUS_POINTS} points`,
        descriptionAr: `مكافأة الطلب الأول: ${FIRST_ORDER_BONUS_POINTS} نقاط`,
        expiresAt,
      },
    });
    logger.info('First order bonus awarded', {
      customerId: input.customerId,
      bonusPoints: FIRST_ORDER_BONUS_POINTS,
    });
  }

  logger.info('Points earned', {
    customerId: input.customerId,
    points: earnedPoints,
    programId: input.programId,
  });

  return mapTransactionToType(transaction);
}

// ============================================
// REDEEM POINTS
// ============================================

/**
 * Redeem points from a customer's balance.
 * Validates minimum redemption threshold and sufficient balance.
 */
export async function redeemPoints(input: RedeemPointsInput): Promise<PointsTransaction> {
  // Validate program exists and is active
  const program = await db.loyaltyProgram.findUnique({ where: { id: input.programId } });
  if (!program || !program.isActive) {
    throw new NotFoundError('Loyalty program not found or inactive', 'PROGRAM_NOT_FOUND');
  }

  // Check minimum redemption threshold
  if (input.points < program.minRedemption) {
    throw new ValidationError(
      `Minimum redemption is ${program.minRedemption} points`,
      'MIN_REDEMPTION_THRESHOLD',
      { minRedemption: program.minRedemption, requested: input.points }
    );
  }

  // Check sufficient balance (excluding pending expiration)
  const currentBalance = await getAvailablePoints(input.customerId, input.programId);
  if (currentBalance < input.points) {
    throw new ValidationError(
      'Insufficient points balance',
      'INSUFFICIENT_POINTS',
      { currentBalance, requested: input.points }
    );
  }

  // Create redeem transaction (negative points)
  const transaction = await db.loyaltyTransaction.create({
    data: {
      customerId: input.customerId,
      programId: input.programId,
      orderId: input.orderId ?? null,
      points: -input.points,
      type: 'redeem',
      descriptionEn: input.descriptionEn ?? `Redeemed ${input.points} points`,
      descriptionAr: input.descriptionAr ?? `تم استبدال ${input.points} نقاط`,
      expiresAt: null,
    },
  });

  logger.info('Points redeemed', {
    customerId: input.customerId,
    points: input.points,
    programId: input.programId,
  });

  return mapTransactionToType(transaction);
}

// ============================================
// BALANCE CHECK
// ============================================

/**
 * Check a customer's loyalty balance for a program
 */
export async function checkBalance(
  customerId: string,
  programId: string
): Promise<BalanceCheckResult> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  const program = await db.loyaltyProgram.findUnique({ where: { id: programId } });
  if (!program) {
    throw new NotFoundError('Loyalty program not found', 'PROGRAM_NOT_FOUND');
  }

  const currentPoints = await getCustomerPointsBalance(customerId, programId);
  const lifetimePoints = await getCustomerLifetimePoints(customerId, programId);
  const availablePoints = await getAvailablePoints(customerId, programId);
  const pendingExpiration = await getPendingExpirationPoints(customerId, programId);

  const tier = getTierByPoints(lifetimePoints);

  return {
    customerId,
    programId,
    currentPoints,
    lifetimePoints,
    availableForRedemption: availablePoints,
    pendingExpiration,
    tier: tier.name,
  };
}

// ============================================
// EXPIRE OLD POINTS
// ============================================

/**
 * Expire points that have passed their expiration date.
 * Should be called periodically (e.g., daily cron).
 */
export async function expireOldPoints(): Promise<number> {
  const now = new Date();

  // Find all unexpired earn/bonus transactions past their expiration date
  const expiredTransactions = await db.loyaltyTransaction.findMany({
    where: {
      type: { in: ['earn', 'bonus'] },
      points: { gt: 0 },
      expiresAt: { not: null, lte: now },
    },
    select: { id: true, customerId: true, programId: true, points: true },
  });

  if (expiredTransactions.length === 0) return 0;

  let totalExpiredPoints = 0;

  for (const tx of expiredTransactions) {
    // Create an expiration transaction
    await db.loyaltyTransaction.create({
      data: {
        customerId: tx.customerId,
        programId: tx.programId,
        points: -tx.points,
        type: 'expire',
        descriptionEn: `Expired ${tx.points} points`,
        descriptionAr: `انتهت صلاحية ${tx.points} نقاط`,
        expiresAt: null,
      },
    });

    // Mark the original transaction as effectively expired by updating its expiresAt
    // (already expired, but we track the expiration via the negative transaction)
    totalExpiredPoints += tx.points;
  }

  logger.info('Points expired', {
    count: expiredTransactions.length,
    totalPoints: totalExpiredPoints,
  });

  return totalExpiredPoints;
}

// ============================================
// TRANSACTION LISTING
// ============================================

/**
 * List transactions for a customer, optionally filtered by program
 */
export async function listTransactions(
  customerId?: string,
  programId?: string,
  type?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ transactions: PointsTransaction[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (programId) where.programId = programId;
  if (type) where.type = type;

  const [transactions, total] = await Promise.all([
    db.loyaltyTransaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.loyaltyTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map(mapTransactionToType),
    total,
  };
}

// ============================================
// PRIVATE HELPERS
// ============================================

/** Get total points balance (sum of all transactions) for a customer in a program */
async function getCustomerPointsBalance(customerId: string, programId: string): Promise<number> {
  const result = await db.loyaltyTransaction.aggregate({
    _sum: { points: true },
    where: { customerId, programId },
  });
  return result._sum.points ?? 0;
}

/** Get lifetime earned points (sum of earn + bonus only) */
async function getCustomerLifetimePoints(customerId: string, programId: string): Promise<number> {
  const result = await db.loyaltyTransaction.aggregate({
    _sum: { points: true },
    where: {
      customerId,
      programId,
      type: { in: ['earn', 'bonus', 'adjust'] },
      points: { gt: 0 },
    },
  });
  return result._sum.points ?? 0;
}

/** Get available points (excluding those past expiration date) */
async function getAvailablePoints(customerId: string, programId: string): Promise<number> {
  const now = new Date();
  const result = await db.loyaltyTransaction.aggregate({
    _sum: { points: true },
    where: {
      customerId,
      programId,
      // Only count positive transactions not yet expired, and all negative transactions
      OR: [
        { points: { lt: 0 } },
        {
          points: { gt: 0 },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
      ],
    },
  });
  return result._sum.points ?? 0;
}

/** Get points pending expiration (positive earn/bonus with expiration date within next 7 days) */
async function getPendingExpirationPoints(customerId: string, programId: string): Promise<number> {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await db.loyaltyTransaction.aggregate({
    _sum: { points: true },
    where: {
      customerId,
      programId,
      type: { in: ['earn', 'bonus'] },
      points: { gt: 0 },
      expiresAt: { not: null, lte: sevenDaysFromNow },
    },
  });
  return result._sum.points ?? 0;
}

/** Map Prisma LoyaltyProgram to LoyaltyProgramConfig */
function mapProgramToConfig(
  program: {
    id: string;
    nameEn: string;
    nameAr: string;
    type: string;
    pointsPerPiastre: number;
    pointsValue: number;
    minRedemption: number;
    maxAccumulation: number | null;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }
): LoyaltyProgramConfig {
  return {
    id: program.id,
    nameEn: program.nameEn,
    nameAr: program.nameAr,
    type: program.type as ProgramType,
    pointsPerPiastre: program.pointsPerPiastre,
    pointsValue: program.pointsValue as number & { __brand: 'Piastres' },
    minRedemption: program.minRedemption,
    maxAccumulation: program.maxAccumulation,
    isActive: program.isActive,
    startsAt: program.startsAt?.toISOString() ?? null,
    endsAt: program.endsAt?.toISOString() ?? null,
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

/** Map Prisma LoyaltyTransaction to PointsTransaction */
function mapTransactionToType(
  tx: {
    id: string;
    customerId: string;
    programId: string;
    orderId: string | null;
    points: number;
    type: string;
    descriptionEn: string;
    descriptionAr: string;
    expiresAt: Date | null;
    createdAt: Date;
  }
): PointsTransaction {
  return {
    id: tx.id,
    customerId: tx.customerId,
    programId: tx.programId,
    orderId: tx.orderId,
    points: tx.points,
    type: tx.type as TransactionType,
    descriptionEn: tx.descriptionEn,
    descriptionAr: tx.descriptionAr,
    expiresAt: tx.expiresAt?.toISOString() ?? null,
    createdAt: tx.createdAt.toISOString(),
  };
}

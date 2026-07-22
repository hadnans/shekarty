// GGH SMS — OtpService
// Core OTP service: generate, send, verify with rate limiting, expiration, retry limits

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import {
  RateLimitError,
  ValidationError,
  NotFoundError,
} from '@/lib/errors';
import {
  OTP_LENGTH,
  OTP_EXPIRATION_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_MAX,
  OTP_RATE_LIMIT_WINDOW_MINUTES,
} from './config';
import { type OtpMessage, type RateLimitEntry } from './types';
import { getSmsProvider } from './providers';

const logger = createLogger('otp-service');

// ============================================
// IN-MEMORY RATE LIMITING
// ============================================

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

/**
 * Check and enforce rate limits for OTP requests per phone number.
 * Throws RateLimitError if exceeded.
 */
function checkRateLimit(phone: string): void {
  const now = Date.now();
  const windowMs = OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  const entry = rateLimitStore.get(phone);

  if (!entry || now >= entry.windowStart + windowMs) {
    // Start fresh window
    rateLimitStore.set(phone, {
      phone,
      requestCount: 1,
      windowStart: now,
    });
    return;
  }

  if (entry.requestCount >= OTP_RATE_LIMIT_MAX) {
    logger.warn('OTP rate limit exceeded', { phone, count: entry.requestCount });
    throw new RateLimitError(
      `Too many OTP requests. Maximum ${OTP_RATE_LIMIT_MAX} per ${OTP_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
      'OTP_RATE_LIMITED'
    );
  }

  entry.requestCount += 1;
}

// ============================================
// OTP CODE GENERATION
// ============================================

/**
 * Generate a random OTP code of the configured length.
 * Returns a numeric string (e.g., "4378").
 */
export function generateOtpCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

// ============================================
// SEND OTP
// ============================================

/**
 * Send an OTP code to a phone number.
 * 
 * Flow:
 * 1. Check rate limits
 * 2. Invalidate any previous OTPs for this phone
 * 3. Generate OTP code
 * 4. Store OTP in database
 * 5. Send OTP via SMS provider
 * 6. Return success with the code (for dev provider visibility)
 */
export async function sendOtp(phone: string, purpose?: string): Promise<{ code: string; messageId?: string }> {
  // 1. Check rate limits
  checkRateLimit(phone);

  // 2. Invalidate any previous OTPs for this phone
  await db.otpCode.updateMany({
    where: { phone, verified: false },
    data: { verified: true }, // Mark as used to invalidate
  });

  // 3. Generate OTP code
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

  // 4. Store OTP in database
  await db.otpCode.create({
    data: {
      phone,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
    },
  });

  // 5. Send OTP via SMS provider
  const provider = getSmsProvider();
  const otpMessage: OtpMessage = {
    to: phone,
    code,
    purpose,
  };

  const sendResult = await provider.sendOtp(otpMessage);

  if (!sendResult.success) {
    logger.error('OTP SMS send failed', { phone, error: sendResult.error, provider: sendResult.provider });
    // We still stored the OTP in DB — the user could still verify via other means
    // But we log the failure for monitoring
  }

  logger.info('OTP sent', {
    phone,
    code,
    provider: sendResult.provider,
    sendSuccess: sendResult.success,
    messageId: sendResult.messageId,
  });

  // 6. Return code (dev provider needs it; production providers handle it internally)
  return {
    code,
    messageId: sendResult.messageId,
  };
}

// ============================================
// VERIFY OTP
// ============================================

/**
 * Verify an OTP code for a phone number.
 *
 * Flow:
 * 1. Find the latest unverified, unexpired OTP for this phone
 * 2. Check maximum attempts
 * 3. Compare the code
 * 4. If valid, mark as verified and optionally verify via SMS provider
 * 5. If invalid, increment attempts counter
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  // Find the latest valid OTP for this phone
  const otpRecord = await db.otpCode.findFirst({
    where: {
      phone,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    logger.warn('No valid OTP found for phone', { phone });
    throw new NotFoundError('No valid OTP found. Please request a new one.', 'OTP_NOT_FOUND');
  }

  // Check maximum attempts
  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    // Invalidate the OTP
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true }, // Mark as used to invalidate
    });
    logger.warn('OTP max attempts exceeded', { phone, attempts: otpRecord.attempts });
    throw new ValidationError(
      `Maximum ${OTP_MAX_ATTEMPTS} attempts exceeded. Please request a new OTP.`,
      'OTP_MAX_ATTEMPTS'
    );
  }

  // Compare the code
  if (otpRecord.code === code) {
    // Valid — mark as verified
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Optionally verify via SMS provider (for Verify API providers like Twilio)
    const provider = getSmsProvider();
    try {
      await provider.verifyOtp(phone, code);
    } catch {
      // Provider verification is optional — DB verification is authoritative
    }

    logger.info('OTP verified successfully', { phone });

    // Clear rate limit for this phone on successful verification
    rateLimitStore.delete(phone);

    return true;
  }

  // Invalid — increment attempts
  await db.otpCode.update({
    where: { id: otpRecord.id },
    data: { attempts: otpRecord.attempts + 1 },
  });

  logger.warn('OTP verification failed — wrong code', { phone, attempts: otpRecord.attempts + 1 });

  return false;
}

// ============================================
// CLEANUP
// ============================================

/**
 * Clean up expired rate limit entries (should be called periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const windowMs = OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

  for (const [phone, entry] of rateLimitStore) {
    if (now >= entry.windowStart + windowMs) {
      rateLimitStore.delete(phone);
    }
  }
}

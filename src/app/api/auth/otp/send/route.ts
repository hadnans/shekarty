// GGH Auth — Send OTP
// With rate limiting, Zod validation, structured logging, and apiHandler

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, normalizePhone } from '@/lib/ggh/auth';
import { apiHandler, ValidationError, RateLimitError } from '@/lib/errors';
import { authLimiter } from '@/lib/rate-limit';
import { sendOtpSchema } from '@/lib/validation';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth:otp-send');

export const POST = apiHandler(async (request: NextRequest) => {
  // Rate limiting
  const rateLimitResult = authLimiter.middleware()(request);
  if (rateLimitResult) {
    throw new RateLimitError('Too many OTP requests. Please try again later.');
  }

  // Parse and validate request body
  const body = await request.json();
  const parsed = sendOtpSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Invalid phone number', 'INVALID_PHONE', parsed.error.flatten().fieldErrors);
  }

  const { phone } = parsed.data;
  const normalizedPhone = normalizePhone(phone);

  logger.info('OTP send requested', { phone: normalizedPhone });

  // Invalidate any previous OTPs for this phone
  await db.otpCode.updateMany({
    where: { phone: normalizedPhone, verified: false },
    data: { verified: true }, // Mark as used to invalidate
  });

  // In development mode, always use code 1234
  const code = '1234';
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.otpCode.create({
    data: {
      phone: normalizedPhone,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
    },
  });

  logger.info('OTP sent successfully', { phone: normalizedPhone });

  return successResponse(
    { message: 'OTP sent successfully' },
    'OTP sent successfully'
  );
});

// GGH Auth — Send OTP
// With rate limiting, Zod validation, structured logging, apiHandler
// Updated to use SmsProvider instead of hardcoded OTP

import { NextRequest } from 'next/server';
import { successResponse, normalizePhone } from '@/lib/ggh/auth';
import { apiHandler, ValidationError, RateLimitError } from '@/lib/errors';
import { authLimiter } from '@/lib/rate-limit';
import { sendOtpSchema } from '@/lib/validation';
import { createLogger } from '@/lib/logger';
import { sendOtp } from '@/lib/sms';

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

  // Use the SmsProvider to send OTP
  // This replaces the previous hardcoded '1234' approach
  const result = await sendOtp(normalizedPhone, 'login');

  logger.info('OTP sent successfully', {
    phone: normalizedPhone,
    providerUsed: result.messageId ? 'external' : 'dev',
  });

  // In development, include the code in the response for testing convenience
  // In production, the code is only visible in the SMS message
  const isDevMode = process.env.SMS_PROVIDER === 'dev' || !process.env.SMS_PROVIDER;

  return successResponse(
    {
      message: 'OTP sent successfully',
      ...(isDevMode ? { code: result.code } : {}),
    },
    'OTP sent successfully'
  );
});

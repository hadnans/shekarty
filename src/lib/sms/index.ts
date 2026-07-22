// GGH SMS System — Barrel exports

// Configuration
export {
  SMS_PROVIDERS,
  DEFAULT_SMS_PROVIDER,
  OTP_LENGTH,
  OTP_EXPIRATION_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_MAX,
  OTP_RATE_LIMIT_WINDOW_MINUTES,
  getTwilioConfig,
  getMessageBirdConfig,
  getVonageConfig,
  getSmsProviderName,
  type SmsProviderName,
} from './config';

// Types
export {
  type SmsMessage,
  type OtpMessage,
  type SendResult,
  type VerifyResult,
  type SmsProviderConfig,
  type RateLimitEntry,
} from './types';

// Provider Interface
export {
  type SmsProvider,
} from './provider-interface';

// Providers
export {
  DevSmsProvider,
} from './providers/dev';

export {
  TwilioSmsProvider,
} from './providers/twilio';

export {
  MessageBirdSmsProvider,
} from './providers/messagebird';

export {
  VonageSmsProvider,
} from './providers/vonage';

export {
  getSmsProvider,
  getSmsProviderByName,
  getAvailableProviders,
  resetProviders,
} from './providers';

// OTP Service
export {
  generateOtpCode,
  sendOtp,
  verifyOtp,
  cleanupRateLimits,
} from './otp-service';

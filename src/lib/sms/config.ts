// GGH SMS — Configuration
// SMS provider configuration from environment variables

/** Supported SMS providers */
export const SMS_PROVIDERS = ['dev', 'twilio', 'messagebird', 'vonage'] as const;
export type SmsProviderName = (typeof SMS_PROVIDERS)[number];

/** Default SMS provider (dev for development/testing) */
export const DEFAULT_SMS_PROVIDER: SmsProviderName = 'dev';

/** OTP code length */
export const OTP_LENGTH = 4;

/** OTP expiration in minutes */
export const OTP_EXPIRATION_MINUTES = 5;

/** Maximum OTP verification attempts */
export const OTP_MAX_ATTEMPTS = 3;

/** Rate limiting: max OTP send requests per phone per time window */
export const OTP_RATE_LIMIT_MAX = 5;

/** Rate limiting: time window in minutes */
export const OTP_RATE_LIMIT_WINDOW_MINUTES = 15;

/** Twilio configuration from env */
export function getTwilioConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    fromNumber: process.env.TWILIO_FROM_NUMBER ?? '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? '',
  };
}

/** MessageBird configuration from env */
export function getMessageBirdConfig() {
  return {
    apiKey: process.env.MESSAGEBIRD_API_KEY ?? '',
    fromNumber: process.env.MESSAGEBIRD_FROM_NUMBER ?? '',
    verifyApiKey: process.env.MESSAGEBIRD_VERIFY_API_KEY ?? '',
  };
}

/** Vonage configuration from env */
export function getVonageConfig() {
  return {
    apiKey: process.env.VONAGE_API_KEY ?? '',
    apiSecret: process.env.VONAGE_API_SECRET ?? '',
    fromNumber: process.env.VONAGE_FROM_NUMBER ?? '',
    verifyApiKey: process.env.VONAGE_VERIFY_API_KEY ?? '',
    verifyApiSecret: process.env.VONAGE_VERIFY_API_SECRET ?? '',
  };
}

/** Get the current SMS provider name from env */
export function getSmsProviderName(): SmsProviderName {
  const provider = process.env.SMS_PROVIDER ?? DEFAULT_SMS_PROVIDER;
  if (SMS_PROVIDERS.includes(provider as SmsProviderName)) {
    return provider as SmsProviderName;
  }
  return DEFAULT_SMS_PROVIDER;
}

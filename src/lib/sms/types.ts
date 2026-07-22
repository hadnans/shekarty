// GGH SMS — Type definitions for SMS/OTP messaging

// ============================================
// SMS MESSAGE
// ============================================

export interface SmsMessage {
  to: string;      // Phone number (normalized: +20XXXXXXXXXX)
  body: string;    // Message text
  from?: string;   // Sender number (optional, uses default from config)
}

// ============================================
// OTP MESSAGE
// ============================================

export interface OtpMessage {
  to: string;      // Phone number (normalized)
  code: string;    // OTP code (e.g., "1234")
  purpose?: string; // Description of OTP purpose (login, verification, etc.)
}

// ============================================
// SEND RESULT
// ============================================

export interface SendResult {
  success: boolean;
  messageId?: string;  // Provider-specific message/verification ID
  error?: string;      // Error message if failed
  provider: string;    // Provider name that handled the request
  cost?: number;       // Cost in provider currency (optional)
}

// ============================================
// VERIFY RESULT
// ============================================

export interface VerifyResult {
  success: boolean;
  error?: string;
}

// ============================================
// SMS PROVIDER CONFIG (stored in DB)
// ============================================

export interface SmsProviderConfig {
  provider: string;     // dev, twilio, messagebird, vonage
  isActive: boolean;    // Whether SMS sending is enabled
  fromNumber: string;   // Default sender number
  configJson: string;   // JSON string with provider-specific config
}

// ============================================
// RATE LIMIT ENTRY
// ============================================

export interface RateLimitEntry {
  phone: string;
  requestCount: number;
  windowStart: number;  // timestamp in ms
}

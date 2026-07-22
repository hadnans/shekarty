// GGH SMS — Provider Interface
// Abstract interface that all SMS providers must implement

import { type SmsMessage, type OtpMessage, type SendResult, type VerifyResult } from './types';

// ============================================
// SMS PROVIDER ABSTRACT INTERFACE
// ============================================

/**
 * SmsProvider — Abstract interface for SMS/OTP operations.
 * Each provider implementation (Twilio, MessageBird, Vonage, Dev)
 * must implement these methods.
 *
 * - sendOtp: Send an OTP code to a phone number
 * - verifyOtp: Verify an OTP code that was previously sent
 * - sendMessage: Send a plain SMS message (non-OTP)
 */
export interface SmsProvider {
  /** Provider name (e.g., 'twilio', 'messagebird', 'vonage', 'dev') */
  readonly name: string;

  /**
   * Send an OTP code to the specified phone number.
   * The provider may use its own OTP verification service
   * (e.g., Twilio Verify) or generate and send the code directly.
   *
   * @param message - OTP message details (phone, code, purpose)
   * @returns SendResult with success status and optional messageId
   */
  sendOtp(message: OtpMessage): Promise<SendResult>;

  /**
   * Verify an OTP code against a previously sent one.
   * If the provider uses a verification service (e.g., Twilio Verify),
   * this calls the provider's verify endpoint.
   * If the provider sends raw OTP, this checks against stored codes.
   *
   * @param phone - Phone number that received the OTP
   * @param code - OTP code to verify
   * @param messageId - Optional provider message/verification ID from sendOtp
   * @returns VerifyResult with success status
   */
  verifyOtp(phone: string, code: string, messageId?: string): Promise<VerifyResult>;

  /**
   * Send a plain SMS message (not OTP-related).
   *
   * @param message - SMS message details (to, body, optional from)
   * @returns SendResult with success status and messageId
   */
  sendMessage(message: SmsMessage): Promise<SendResult>;
}

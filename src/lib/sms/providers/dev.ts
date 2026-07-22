// GGH SMS — Dev Provider
// Development/testing provider: logs OTP to console, allows "1234" for testing
// No actual SMS is sent — used in development environments

import { type SmsProvider } from '../provider-interface';
import { type SmsMessage, type OtpMessage, type SendResult, type VerifyResult } from '../types';
import { OTP_LENGTH } from '../config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sms-dev-provider');

/**
 * DevSmsProvider — Development SMS provider.
 *
 * Behavior:
 * - sendOtp: Generates an OTP code, logs it to console, always returns success
 *   The hardcoded test code "1234" is always accepted by verifyOtp.
 * - verifyOtp: Accepts "1234" as a valid code regardless of what was sent
 *   Also accepts the actual code that was generated during sendOtp.
 * - sendMessage: Logs the message to console, always returns success.
 *
 * This provider is intended ONLY for development and testing.
 * Never use in production.
 */
export class DevSmsProvider implements SmsProvider {
  readonly name = 'dev';

  // In-memory store of recently sent OTP codes for this provider
  private sentCodes: Map<string, string> = new Map();

  async sendOtp(message: OtpMessage): Promise<SendResult> {
    const code = message.code ?? this.generateOtpCode();

    // Store the code for later verification
    this.sentCodes.set(message.to, code);

    // Log the OTP for developer visibility
    logger.info('🔒 [DEV SMS] OTP sent', {
      to: message.to,
      code,
      purpose: message.purpose ?? 'login',
      note: 'Use code "1234" for testing, or the actual code shown above',
    });

    console.log(`\n🔑 OTP for ${message.to}: ${code} (Test code: 1234)\n`);

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      provider: this.name,
    };
  }

  async verifyOtp(phone: string, code: string, messageId?: string): Promise<VerifyResult> {
    // Always accept "1234" for testing convenience
    if (code === '1234') {
      logger.info('🔒 [DEV SMS] OTP verified with test code', { phone, code: '1234' });
      this.sentCodes.delete(phone);
      return { success: true };
    }

    // Check against the actual stored code
    const storedCode = this.sentCodes.get(phone);
    if (storedCode && storedCode === code) {
      logger.info('🔒 [DEV SMS] OTP verified', { phone, code });
      this.sentCodes.delete(phone);
      return { success: true };
    }

    logger.warn('🔒 [DEV SMS] OTP verification failed', { phone, code, expected: storedCode });
    return {
      success: false,
      error: 'Invalid OTP code',
    };
  }

  async sendMessage(message: SmsMessage): Promise<SendResult> {
    logger.info('📱 [DEV SMS] Message sent', {
      to: message.to,
      body: message.body.substring(0, 50),
    });

    console.log(`\n📱 SMS to ${message.to}: ${message.body}\n`);

    return {
      success: true,
      messageId: `dev-msg-${Date.now()}`,
      provider: this.name,
    };
  }

  /**
   * Generate a random OTP code of the configured length
   */
  private generateOtpCode(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }
}

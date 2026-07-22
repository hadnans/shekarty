// GGH SMS — Vonage Provider
// Vonage (formerly Nexmo) SMS and Verify integration
// Configurable via environment variables

import { type SmsProvider } from '../provider-interface';
import { type SmsMessage, type OtpMessage, type SendResult, type VerifyResult } from '../types';
import { getVonageConfig } from '../config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sms-vonage-provider');

/**
 * VonageSmsProvider — Vonage SMS/OTP provider.
 *
 * Uses Vonage API for SMS sending and optional Verify service for OTP.
 */
export class VonageSmsProvider implements SmsProvider {
  readonly name = 'vonage';
  private config: ReturnType<typeof getVonageConfig>;

  constructor() {
    this.config = getVonageConfig();
  }

  async sendOtp(message: OtpMessage): Promise<SendResult> {
    const { apiKey, apiSecret, fromNumber, verifyApiKey, verifyApiSecret } = this.config;

    if (!apiKey || !apiSecret) {
      return { success: false, error: 'Vonage credentials not configured', provider: this.name };
    }

    try {
      // Use Verify API if configured
      if (verifyApiKey && verifyApiSecret) {
        const response = await fetch('https://api.nexmo.com/verify/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            api_key: verifyApiKey,
            api_secret: verifyApiSecret,
            number: message.to,
            brand: 'GGH',
            code_length: String(message.code.length),
            pin_expiry: '300', // 5 minutes
            lg: 'en-us',
          }).toString(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error_text: 'Unknown error' }));
          logger.error('Vonage Verify send failed', { status: response.status, error: errorData });
          return { success: false, error: errorData.error_text ?? response.statusText, provider: this.name };
        }

        const data = await response.json();
        if (data.status !== '0') {
          return { success: false, error: data.error_text ?? 'Verify request failed', provider: this.name };
        }

        logger.info('Vonage Verify OTP sent', { to: message.to, requestId: data.request_id });

        return { success: true, messageId: data.request_id, provider: this.name };
      }

      // Otherwise, send plain SMS
      const from = fromNumber || 'GGH';
      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          api_key: apiKey,
          api_secret: apiSecret,
          to: message.to,
          from: from,
          text: `Your verification code is: ${message.code}. Do not share this code.`,
          type: 'unicode',
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ messages: [{ error_text: 'Unknown error' }] }));
        const errorMsg = errorData.messages?.[0]?.error_text ?? response.statusText;
        return { success: false, error: errorMsg, provider: this.name };
      }

      const data = await response.json();
      if (data.messages?.[0]?.status !== '0') {
        return { success: false, error: data.messages?.[0]?.error_text ?? 'SMS failed', provider: this.name };
      }

      logger.info('Vonage SMS OTP sent', { to: message.to, messageId: data.messages?.[0]?.message_id });

      return {
        success: true,
        messageId: data.messages?.[0]?.message_id ?? `vonage-${Date.now()}`,
        provider: this.name,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg, provider: this.name };
    }
  }

  async verifyOtp(phone: string, code: string, messageId?: string): Promise<VerifyResult> {
    const { verifyApiKey, verifyApiSecret } = this.config;

    if (verifyApiKey && verifyApiSecret && messageId) {
      try {
        const response = await fetch('https://api.nexmo.com/verify/check/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            api_key: verifyApiKey,
            api_secret: verifyApiSecret,
            request_id: messageId,
            code: code,
          }).toString(),
        });

        if (!response.ok) {
          return { success: false, error: 'Verification check failed' };
        }

        const data = await response.json();
        const isValid = data.status === '0';

        logger.info('Vonage Verify check', { phone, status: data.status });

        return { success: isValid, error: isValid ? undefined : 'Invalid OTP code' };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
      }
    }

    // Without Verify API, OtpService handles verification via DB
    logger.warn('Vonage Verify API not configured — OTP verification should be handled by OtpService');
    return { success: false, error: 'Verify API not configured' };
  }

  async sendMessage(message: SmsMessage): Promise<SendResult> {
    const { apiKey, apiSecret, fromNumber } = this.config;

    if (!apiKey || !apiSecret) {
      return { success: false, error: 'Vonage credentials not configured', provider: this.name };
    }

    try {
      const from = message.from ?? fromNumber ?? 'GGH';

      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          api_key: apiKey,
          api_secret: apiSecret,
          to: message.to,
          from: from,
          text: message.body,
          type: 'unicode',
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ messages: [{ error_text: 'Unknown error' }] }));
        const errorMsg = errorData.messages?.[0]?.error_text ?? response.statusText;
        return { success: false, error: errorMsg, provider: this.name };
      }

      const data = await response.json();
      logger.info('Vonage SMS sent', { to: message.to });

      return {
        success: true,
        messageId: data.messages?.[0]?.message_id ?? `vonage-msg-${Date.now()}`,
        provider: this.name,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg, provider: this.name };
    }
  }
}

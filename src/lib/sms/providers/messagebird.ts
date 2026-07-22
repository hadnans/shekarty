// GGH SMS — MessageBird Provider
// MessageBird SMS and Verify integration
// Configurable via environment variables

import { type SmsProvider } from '../provider-interface';
import { type SmsMessage, type OtpMessage, type SendResult, type VerifyResult } from '../types';
import { getMessageBirdConfig } from '../config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sms-messagebird-provider');

/**
 * MessageBirdSmsProvider — MessageBird SMS/OTP provider.
 *
 * Uses MessageBird API for SMS sending and optional Verify service for OTP.
 */
export class MessageBirdSmsProvider implements SmsProvider {
  readonly name = 'messagebird';
  private config: ReturnType<typeof getMessageBirdConfig>;

  constructor() {
    this.config = getMessageBirdConfig();
  }

  async sendOtp(message: OtpMessage): Promise<SendResult> {
    const { apiKey, fromNumber, verifyApiKey } = this.config;

    if (!apiKey) {
      return { success: false, error: 'MessageBird API key not configured', provider: this.name };
    }

    try {
      // Use Verify API if configured
      if (verifyApiKey) {
        const response = await fetch('https://verify.messagebird.com/v1/verify', {
          method: 'POST',
          headers: {
            'Authorization': `AccessKey ${verifyApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: message.to,
            originator: fromNumber || 'GGH',
            template: `Your verification code is ${message.code}. Do not share this code.`,
            type: 'sms',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          logger.error('MessageBird Verify send failed', { status: response.status, error: errorData });
          return { success: false, error: `MessageBird Verify error: ${errorData.message ?? response.statusText}`, provider: this.name };
        }

        const data = await response.json();
        logger.info('MessageBird Verify OTP sent', { to: message.to, id: data.id });

        return { success: true, messageId: data.id, provider: this.name };
      }

      // Otherwise, send plain SMS
      const response = await fetch('https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originator: fromNumber || 'GGH',
          recipients: [message.to],
          body: `Your verification code is: ${message.code}. Do not share this code.`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: [{ description: 'Unknown error' }] }));
        const errorMsg = errorData.errors?.[0]?.description ?? response.statusText;
        return { success: false, error: errorMsg, provider: this.name };
      }

      const data = await response.json();
      logger.info('MessageBird SMS OTP sent', { to: message.to, id: data.id });

      return { success: true, messageId: data.id, provider: this.name };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg, provider: this.name };
    }
  }

  async verifyOtp(phone: string, code: string, messageId?: string): Promise<VerifyResult> {
    const { verifyApiKey } = this.config;

    if (verifyApiKey && messageId) {
      try {
        const response = await fetch(`https://verify.messagebird.com/v1/verify/${messageId}?token=${code}`, {
          method: 'GET',
          headers: {
            'Authorization': `AccessKey ${verifyApiKey}`,
          },
        });

        if (!response.ok) {
          return { success: false, error: 'Verification failed' };
        }

        const data = await response.json();
        const isValid = data.status === 'verified';

        logger.info('MessageBird Verify check', { phone, status: data.status });

        return { success: isValid, error: isValid ? undefined : 'Invalid OTP code' };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: msg };
      }
    }

    // Without Verify API, OtpService handles verification via DB
    logger.warn('MessageBird Verify API not configured — OTP verification should be handled by OtpService');
    return { success: false, error: 'Verify API not configured' };
  }

  async sendMessage(message: SmsMessage): Promise<SendResult> {
    const { apiKey, fromNumber } = this.config;

    if (!apiKey) {
      return { success: false, error: 'MessageBird API key not configured', provider: this.name };
    }

    try {
      const from = message.from ?? fromNumber ?? 'GGH';

      const response = await fetch('https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originator: from,
          recipients: [message.to],
          body: message.body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: [{ description: 'Unknown error' }] }));
        const errorMsg = errorData.errors?.[0]?.description ?? response.statusText;
        return { success: false, error: errorMsg, provider: this.name };
      }

      const data = await response.json();
      logger.info('MessageBird SMS sent', { to: message.to, id: data.id });

      return { success: true, messageId: data.id, provider: this.name };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg, provider: this.name };
    }
  }
}

// GGH SMS — Twilio Provider
// Twilio SMS and Verify service integration
// Configurable via environment variables

import { type SmsProvider } from '../provider-interface';
import { type SmsMessage, type OtpMessage, type SendResult, type VerifyResult } from '../types';
import { getTwilioConfig } from '../config';
import { createLogger } from '@/lib/logger';

const logger = createLogger('sms-twilio-provider');

/**
 * TwilioSmsProvider — Twilio SMS/OTP provider.
 *
 * Two modes:
 * 1. With Verify Service (recommended for OTP):
 *    - Uses Twilio Verify API for OTP send/verify
 *    - More secure, handles rate limiting and expiration
 *    - Requires TWILIO_VERIFY_SERVICE_SID env var
 *
 * 2. Without Verify Service (manual OTP):
 *    - Sends OTP codes via Twilio SMS API directly
 *    - Verification is handled by our OtpService using DB-stored codes
 *    - Requires only standard Twilio credentials
 */
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';
  private config: ReturnType<typeof getTwilioConfig>;

  constructor() {
    this.config = getTwilioConfig();
  }

  async sendOtp(message: OtpMessage): Promise<SendResult> {
    const { accountSid, authToken, fromNumber, verifyServiceSid } = this.config;

    if (!accountSid || !authToken) {
      logger.error('Twilio credentials not configured');
      return {
        success: false,
        error: 'Twilio credentials not configured',
        provider: this.name,
      };
    }

    try {
      // If Verify Service is configured, use it for OTP
      if (verifyServiceSid) {
        const response = await fetch(
          `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: message.to,
              Channel: 'sms',
              CustomCode: message.code, // Use our generated code
            }).toString(),
            auth: `${accountSid}:${authToken}`,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          logger.error('Twilio Verify send failed', { status: response.status, error: errorData });
          return {
            success: false,
            error: `Twilio Verify error: ${errorData.message ?? response.statusText}`,
            provider: this.name,
          };
        }

        const data = await response.json();
        logger.info('Twilio Verify OTP sent', { to: message.to, sid: data.sid });

        return {
          success: true,
          messageId: data.sid,
          provider: this.name,
        };
      }

      // Otherwise, send OTP via regular SMS
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: message.to,
            From: fromNumber,
            Body: `Your verification code is: ${message.code}. Do not share this code.`,
          }).toString(),
          auth: `${accountSid}:${authToken}`,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        logger.error('Twilio SMS send failed', { status: response.status, error: errorData });
        return {
          success: false,
          error: `Twilio SMS error: ${errorData.message ?? response.statusText}`,
          provider: this.name,
        };
      }

      const data = await response.json();
      logger.info('Twilio SMS OTP sent', { to: message.to, sid: data.sid });

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Twilio sendOtp error', { error: msg });
      return {
        success: false,
        error: msg,
        provider: this.name,
      };
    }
  }

  async verifyOtp(phone: string, code: string, messageId?: string): Promise<VerifyResult> {
    const { accountSid, authToken, verifyServiceSid } = this.config;

    // If Verify Service is configured, use it for verification
    if (verifyServiceSid && accountSid && authToken) {
      try {
        const response = await fetch(
          `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: phone,
              Code: code,
            }).toString(),
            auth: `${accountSid}:${authToken}`,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          logger.error('Twilio Verify check failed', { status: response.status, error: errorData });
          return {
            success: false,
            error: `Twilio Verify error: ${errorData.message ?? response.statusText}`,
          };
        }

        const data = await response.json();
        const isValid = data.status === 'approved';

        logger.info('Twilio Verify check', { phone, status: data.status });

        return {
          success: isValid,
          error: isValid ? undefined : 'Invalid OTP code',
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Twilio verifyOtp error', { error: msg });
        return { success: false, error: msg };
      }
    }

    // Without Verify Service, our OtpService handles verification via DB
    // This provider only sends the SMS; verification is done separately
    logger.warn('Twilio Verify Service not configured — OTP verification should be handled by OtpService');
    return { success: false, error: 'Verify Service not configured' };
  }

  async sendMessage(message: SmsMessage): Promise<SendResult> {
    const { accountSid, authToken, fromNumber } = this.config;

    if (!accountSid || !authToken) {
      return {
        success: false,
        error: 'Twilio credentials not configured',
        provider: this.name,
      };
    }

    try {
      const from = message.from ?? fromNumber;

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: message.to,
            From: from,
            Body: message.body,
          }).toString(),
          auth: `${accountSid}:${authToken}`,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: `Twilio SMS error: ${errorData.message ?? response.statusText}`,
          provider: this.name,
        };
      }

      const data = await response.json();
      logger.info('Twilio SMS sent', { to: message.to, sid: data.sid });

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: msg, provider: this.name };
    }
  }
}

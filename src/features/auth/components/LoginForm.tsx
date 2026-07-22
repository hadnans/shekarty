'use client';

import { useState, useCallback } from 'react';
import { Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type Lang, type AuthResponse } from '@/types/ggh';
import { t } from '@/lib/ggh/i18n';
import { useLangStore } from '@/stores/lang-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/services/api';
import OtpInput from './OtpInput';

interface LoginFormProps {
  onSuccess: (response: AuthResponse) => void;
  lang?: Lang;
}

type Step = 'phone' | 'otp';

export default function LoginForm({ onSuccess, lang: langProp }: LoginFormProps) {
  const { lang: storeLang, isRTL } = useLangStore();
  const lang = langProp ?? storeLang;
  const { setLoading, isLoading } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpError, setOtpError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Format phone number (Egyptian format)
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setPhoneError('');
  };

  const handleSendCode = useCallback(async () => {
    const digits = phone.replace(/\s/g, '');
    if (digits.length < 11 || !digits.startsWith('01')) {
      setPhoneError(lang === 'ar' ? 'رقم موبايل غير صحيح' : 'Invalid phone number');
      return;
    }

    setLoading(true);
    try {
      await api.sendOtp(digits);
      setStep('otp');
      setResendCountdown(60);
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setPhoneError(lang === 'ar' ? 'حصل خطأ، حاول تاني' : 'Something went wrong, try again');
    } finally {
      setLoading(false);
    }
  }, [phone, lang, setLoading]);

  const handleOtpComplete = useCallback(
    async (code: string) => {
      setOtpError('');
      setLoading(true);
      try {
        const digits = phone.replace(/\s/g, '');
        const response = await api.verifyOtp(digits, code);
        if (response.success) {
          onSuccess(response);
        } else {
          setOtpError(lang === 'ar' ? 'الكود غلط' : 'Invalid code');
        }
      } catch {
        setOtpError(lang === 'ar' ? 'الكود غلط، حاول تاني' : 'Invalid code, try again');
      } finally {
        setLoading(false);
      }
    },
    [phone, lang, onSuccess, setLoading]
  );

  const handleResend = useCallback(async () => {
    if (resendCountdown > 0) return;
    const digits = phone.replace(/\s/g, '');
    try {
      await api.sendOtp(digits);
      setResendCountdown(60);
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Silently fail on resend
    }
  }, [phone, resendCountdown]);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        {step === 'phone' ? (
          <motion.div
            key="phone"
            initial={{ x: isRTL ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 50 : -50, opacity: 0 }}
            className="space-y-6"
          >
            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'welcomeBack')}
              </h2>
              <p className="text-base" style={{ color: 'var(--ggh-text-secondary)' }}>
                {t(lang, 'enterPhone')}
              </p>
            </div>

            {/* Phone input */}
            <div className="space-y-2">
              <div className="relative">
                <Phone
                  className="absolute top-1/2 -translate-y-1/2 size-5"
                  style={{
                    color: 'var(--ggh-text-secondary)',
                    [isRTL ? 'right' : 'left']: '14px',
                  }}
                />
                <Input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={t(lang, 'phonePlaceholder')}
                  className="h-14 text-lg rounded-xl"
                  style={{
                    [isRTL ? 'paddingRight' : 'paddingLeft']: '44px',
                  }}
                  maxLength={13}
                  dir="ltr"
                  aria-label={t(lang, 'enterPhone')}
                />
              </div>
              {phoneError && (
                <p className="text-sm font-medium" style={{ color: '#CF222E' }}>
                  {phoneError}
                </p>
              )}
            </div>

            {/* Send code button */}
            <Button
              className="w-full h-14 text-lg font-bold rounded-xl"
              style={{ backgroundColor: 'var(--ggh-primary)', color: '#FFFFFF' }}
              onClick={handleSendCode}
              disabled={isLoading || phone.replace(/\s/g, '').length < 11}
            >
              {isLoading ? t(lang, 'loading') : t(lang, 'sendCode')}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ x: isRTL ? -50 : 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 50 : -50, opacity: 0 }}
            className="space-y-6"
          >
            {/* Title */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--ggh-text)' }}>
                {t(lang, 'enterCode')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
                {t(lang, 'codeSent', { phone })}
              </p>
            </div>

            {/* OTP input */}
            <OtpInput
              onComplete={handleOtpComplete}
              disabled={isLoading}
              error={otpError}
              lang={lang}
            />

            {/* Resend code */}
            <div className="text-center">
              {resendCountdown > 0 ? (
                <span className="text-sm" style={{ color: 'var(--ggh-text-secondary)' }}>
                  {t(lang, 'resendIn', { seconds: resendCountdown })}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  className="text-sm font-medium h-10"
                  style={{ color: 'var(--ggh-primary)' }}
                  onClick={handleResend}
                >
                  {t(lang, 'resendCode')}
                </Button>
              )}
            </div>

            {/* Back button */}
            <Button
              variant="ghost"
              className="w-full h-12 text-sm font-medium rounded-lg"
              style={{ color: 'var(--ggh-text-secondary)' }}
              onClick={() => {
                setStep('phone');
                setOtpError('');
              }}
            >
              <BackArrow className="size-4 me-2" />
              {t(lang, 'back')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

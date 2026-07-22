'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { type Lang } from '@/types/ggh';
import { useLangStore } from '@/stores/lang-store';
import { t } from '@/lib/ggh/i18n';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  lang?: Lang;
  disabled?: boolean;
  error?: string;
}

export default function OtpInput({ length = 4, onComplete, lang: langProp, disabled = false, error }: OtpInputProps) {
  const { lang: storeLang } = useLangStore();
  const lang = langProp ?? storeLang;
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, '').slice(-1);
      if (!digit && value.length > 0) return;

      const newValues = [...values];
      newValues[index] = digit;
      setValues(newValues);

      // Auto-focus next input
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if all filled
      if (newValues.every((v) => v !== '')) {
        onComplete(newValues.join(''));
      }
    },
    [values, length, onComplete]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!values[index] && index > 0) {
          // Move focus to previous input on backspace if current is empty
          inputRefs.current[index - 1]?.focus();
          const newValues = [...values];
          newValues[index - 1] = '';
          setValues(newValues);
        } else {
          const newValues = [...values];
          newValues[index] = '';
          setValues(newValues);
        }
      }
    },
    [values]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (pasted.length === 0) return;

      const newValues = [...values];
      for (let i = 0; i < pasted.length; i++) {
        newValues[i] = pasted[i];
      }
      setValues(newValues);

      // Focus the next empty input or the last one
      const nextEmpty = newValues.findIndex((v) => v === '');
      const focusIndex = nextEmpty >= 0 ? nextEmpty : length - 1;
      inputRefs.current[focusIndex]?.focus();

      if (newValues.every((v) => v !== '')) {
        onComplete(newValues.join(''));
      }
    },
    [values, length, onComplete]
  );

  return (
    <div>
      <div className="flex justify-center gap-3 sm:gap-4">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={values[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className="h-14 w-14 sm:h-16 sm:w-16 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: error
                ? '#CF222E'
                : values[index]
                ? 'var(--ggh-primary)'
                : 'var(--ggh-border)',
              color: 'var(--ggh-text)',
              backgroundColor: '#FFFFFF',
              focusRingColor: error ? '#CF222E' : 'var(--ggh-primary)',
            }}
            aria-label={`${t(lang, 'enterCode')} ${index + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm font-medium mt-2 text-center" style={{ color: '#CF222E' }}>
          {error}
        </p>
      )}
    </div>
  );
}

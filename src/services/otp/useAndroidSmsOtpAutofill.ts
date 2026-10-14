import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { extractOtpFromSms } from '@/src/utils/otp/sanitizeOtp';
import { consoleLogDev } from '@/src/utils/consoleLogDev';
import {
  smsOtpRetriever,
  type SmsOtpMessageEvent,
} from './smsOtpRetriever';

const LOG_TAG = '[OTP_AUTOFILL]';

/**
 * Redacts the OTP digits from the SMS body before logging so we never log PII
 * while still giving enough context (length + trailing app hash) to debug
 * "nothing happens" reports. Example output:
 *   "<#> **** is your login OTP. Do not share this code with anyone. - RUPYA\nWwGEKwfwaqv"
 */
function redactOtpDigits(message: string, length: number): string {
  if (!message) return '';
  const mask = '*'.repeat(Math.max(length, 1));
  return message
    .replace(new RegExp(`(?<!\\d)\\d{${length}}(?!\\d)`), mask)
    .replace(new RegExp(`\\d{${length},}`), mask);
}

interface UseAndroidSmsOtpAutofillOptions {
  /** Expected OTP length in digits. Used to extract the code from the SMS body. */
  length: number;
  /** Called with the parsed OTP. Empty string is never emitted. */
  onOtp: (otp: string) => void;
  /**
   * When false, the listener is stopped (e.g. while verifying / after success).
   * Defaults to true.
   */
  enabled?: boolean;
  /** When true, logs the app hash once in dev so backend can verify SMS template. */
  logAppHashInDev?: boolean;
}

/**
 * Listens for an OTP SMS via the Android SMS Retriever API and parses the
 * matching digits out of the message body. No-op on iOS / when the native
 * module is unavailable.
 *
 * Usage:
 *   useAndroidSmsOtpAutofill({
 *     length: 4,
 *     onOtp: setOtp,
 *     enabled: !isVerifying,
 *     logAppHashInDev: true,
 *   });
 */
export function useAndroidSmsOtpAutofill({
  length,
  onOtp,
  enabled = true,
  logAppHashInDev = false,
}: UseAndroidSmsOtpAutofillOptions): void {
  // Keep latest callback in a ref so we don't restart the listener on every
  // render just because the parent recreated `onOtp`.
  const onOtpRef = useRef(onOtp);
  useEffect(() => {
    onOtpRef.current = onOtp;
  }, [onOtp]);

  const hashLoggedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      console.log(
        `${LOG_TAG} Hook disabled (e.g. verifying OTP). Listener not started.`
      );
      return;
    }

    if (!smsOtpRetriever.isAvailable) {
      // The module init in smsOtpRetriever.ts has already warned about WHY
      // (old build / iOS). Add a hook-level breadcrumb so log readers can see
      // the screen actually mounted and tried to register.
      console.log(
        `${LOG_TAG} Hook mounted on ${Platform.OS} but native module unavailable — no listener registered.`
      );
      return;
    }

    console.log(
      `${LOG_TAG} Hook mounted (length=${length}). Registering listeners and starting SMS Retriever.`
    );

    let isActive = true;

    const handleMessage = (event: SmsOtpMessageEvent) => {
      if (!isActive) return;

      const rawMessage = event.message ?? '';
      console.log(
        `${LOG_TAG} SMS message broadcast received (${rawMessage.length} chars). Body (OTP redacted):`,
        redactOtpDigits(rawMessage, length)
      );

      const otp = extractOtpFromSms(rawMessage, length);
      if (otp.length === length) {
        console.log(
          `${LOG_TAG} Extracted ${length}-digit OTP from SMS. Filling field.`
        );
        onOtpRef.current(otp);
      } else {
        // Most common cause: SMS body did not contain a numeric run of the
        // expected length (e.g. backend changed format or OTP_LENGTH mismatch).
        console.warn(
          `${LOG_TAG} Received SMS but could NOT extract a ${length}-digit code. ` +
            `Check OTP_LENGTH on the screen and the backend SMS template.`
        );
      }
    };

    const unsubscribeMessage = smsOtpRetriever.addMessageListener(handleMessage);
    const unsubscribeTimeout = smsOtpRetriever.addTimeoutListener(() => {
      // 5-minute SMS Retriever window elapsed. Usually means either no SMS
      // arrived or the SMS hash did not match this build's app hash.
      console.warn(
        `${LOG_TAG} SMS Retriever timed out after 5 minutes — no matching SMS received. ` +
          `Verify the backend SMS hash matches this build's app hash.`
      );
    });

    // Fire-and-forget; failure just means autofill is unavailable for this run.
    void smsOtpRetriever.start();

    if (logAppHashInDev && __DEV__ && !hashLoggedRef.current) {
      hashLoggedRef.current = true;
      void smsOtpRetriever.getAppHash().then((hashes) => {
        if (hashes.length > 0) {
          console.log(`${LOG_TAG} App hash(es) for this build:`, hashes);
        } else {
          console.log(
            `${LOG_TAG} getAppHash() returned no hashes — module unavailable or signature lookup failed.`
          );
        }
      });
    }

    return () => {
      isActive = false;
      console.log(`${LOG_TAG} Hook unmounting. Stopping SMS Retriever.`);
      unsubscribeMessage();
      unsubscribeTimeout();
      void smsOtpRetriever.stop();
    };
  }, [enabled, length, logAppHashInDev]);
}

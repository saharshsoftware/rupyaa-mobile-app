import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, spacing, typography } from '@/src/theme';
import {
  AppText,
  OTPInput,
  Button,
  CountdownTimer,
  FormLayout,
  RupyaaLogo,
} from '@/src/components';
import { STORAGE_KEYS } from '@/src/constants/data';
import { authService } from '@/src/services/auth/authService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { fetchUserStage } from '@/src/services/user/useUserStage';
import ErrorContainer from '@/src/components/ErrorContainer';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { fetchAndStoreUserPersonalDetails, saveUserAppInfoForCurrentSession } from '@/src/services/user';
import { trySyncFcmTokenForAuthenticatedUser } from '@/src/utils/notifications/trySyncFcmTokenForAuthenticatedUser';
import { executeCredeauSyncOnAppOpen } from '@/src/services/credeau/credeau-sync-service';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import { useAndroidSmsOtpAutofill } from '@/src/services/otp';

const OTP_LENGTH = 4;

export default function OTPVerificationScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);
  const params = useLocalSearchParams();
  const phoneNumber = params.phoneNumber as string;
  const displayPhoneNumber = phoneNumber?.startsWith('+91') ? phoneNumber : `+91 ${phoneNumber ?? ''}`;
  const initialRequestId = typeof params.requestId === 'string' ? params.requestId : undefined;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(initialRequestId);

  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: authService.verifyOtp,
    onSuccess: async (response) => {
      if (!response.success) {
        const errorMessage = getApiErrorDisplayMessage(response.error);
        setError(errorMessage || 'Incorrect OTP. Try again.');
        return;
      }

      const accessToken = response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      if (!accessToken) {
        setError('Unable to verify OTP. Please try again.');
        return;
      }

      void logAnalyticsEvent(ANALYTICS_EVENT.OTP_SUCCESS_SCREEN);

      await AsyncStorage.setItem(STORAGE_KEYS.isPhoneVerified, 'true');
      await setTokens(accessToken, refreshToken);
      router.replace('/permissions');
      void saveUserAppInfoForCurrentSession();
      // Fetch user stage after login without blocking navigation.
      void fetchUserStage();
      // Load profile before FCM registration — push sync requires `personalDetails` (e.g. userId).
      const personalDetails = await fetchAndStoreUserPersonalDetails({ forceRefresh: true });
      if (personalDetails) {
        await trySyncFcmTokenForAuthenticatedUser(personalDetails);
      }
      // Run Credeau sync on every successful login when permission is granted.
      void executeCredeauSyncOnAppOpen();
    },
    onError: () => {
      setError('Unable to verify OTP. Please try again.');
    },
  });

  const { mutate: resendOtp } = useMutation({
    mutationFn: authService.requestOtp,
    onSuccess: (response) => {
      if (!response.success) {
        setError(response.error.message || 'Unable to resend OTP. Please try again.');
        return;
      }
      if (response.data.requestId) {
        setRequestId(response.data.requestId);
      }
    },
    onError: () => {
      setError('Unable to resend OTP. Please try again.');
    },
  });

  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerifyOTP();
    }
  }, [otp]);

  // Android-only: listens for the login OTP SMS via Google's SMS Retriever
  // API and auto-fills the field. No-op on iOS / when the native module is
  // unavailable — manual entry + QuickType remain the fallback.
  useAndroidSmsOtpAutofill({
    length: OTP_LENGTH,
    onOtp: setOtp,
    enabled: !isVerifying,
    logAppHashInDev: true,
  });

  const handleVerifyOTP = () => {
    if (isVerifying || otp.length !== OTP_LENGTH || !phoneNumber) return;
    setError('');
    void logAnalyticsEvent(ANALYTICS_EVENT.VERIFY_OTP_CLICK);

    verifyOtp({
      phoneNumber,
      otp,
      requestId,
    });
  };

  const handleResend = () => {
    setOtp('');
    setError('');

    if (!phoneNumber) return;
    resendOtp({ phoneNumber });
  };

  const handleOTPChange = (value: string) => {
    setError('');
    setOtp(value);
  };

  const handleChangePhoneNumber = () => {
    router.back();
  };

  return (
    <FormLayout
        keyboardAwareFooter
        header={<RupyaaLogo size="xs" style={styles.logo} />}
        contentContainerStyle={styles.formContent}
        footerStyle={styles.footer}
        footer={
          <>
            <Button
              size="large"
              fullWidth
              disabled={otp.length !== OTP_LENGTH || isVerifying}
              loading={isVerifying}
              onPress={handleVerifyOTP}
              style={styles.continueButton}
              textStyle={styles.continueButtonText}
            >
              Verify OTP
            </Button>
          </>
        }
      >
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <AppText style={styles.title} variant="h3" weight="bold">
              Enter OTP
            </AppText>
            <View style={styles.phoneNumberContainer}>
              <TouchableOpacity onPress={handleChangePhoneNumber} style={styles.changeButton}>
                <AppText style={styles.phoneNumber} variant="caption" weight="regular">
                  We&apos;ve sent a 4-digit OTP to {displayPhoneNumber}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.otpContainer}>
            <OTPInput
              length={OTP_LENGTH}
              value={otp}
              onChange={handleOTPChange}
              disabled={isVerifying}
              hasError={!!error}
              autoFocus
              cellStyle={styles.otpCell}
            />
          </View>
          <View style={styles.timerContainer}>
            <CountdownTimer
              initialSeconds={60}
              onResend={handleResend}
              textBefore="Didn't receive the OTP?"
              linkText="Resend"
              textColor={colors.text.primary}
              accentColor={colors.text.primary}
              secondsOnlyFormat
            />
          </View>
          <ErrorContainer responseError={error} />
        </View>
      </FormLayout>
  );
}

const styles = StyleSheet.create({
  formContent: {
    paddingHorizontal: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
  },
  logo: {
    marginTop: spacing['3xl'],
  },
  content: {
    paddingTop: spacing.xl,
  },
  titleContainer: {
    marginBottom: spacing.base,
  },
  title: {
    color: colors.text.primary,
    marginBottom: 0,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  phoneNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneNumber: {
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  changeButton: {
    paddingVertical: 0,
  },
  errorContainer: {
    marginBottom: spacing.base,
    alignItems: 'flex-start',
  },
  errorText: {
    color: colors.error.main,
  },
  otpContainer: {
    marginBottom: spacing.lg,
  },
  otpCell: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.warning.light,
    backgroundColor: colors.background.primary,
  },
  timerContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.base,
  },
  continueButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.warning.light,
    paddingVertical: 0,
  },
  continueButtonText: {
    color: colors.text.black,
    fontSize: typography.fontSize.base,
  },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { colors, radius, spacing, typography } from '@/src/theme';
import {
  AppText,
  PhoneInput,
  Checkbox,
  Button,
  FormLayout,
  RupyaaLogo,
} from '@/src/components';
import { authService } from '@/src/services/auth/authService';
import { IMAGES } from '@/src/constants/images';
import ErrorContainer from '@/src/components/ErrorContainer';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import {
  isPhoneNumberHintAvailable,
  requestPhoneNumberHint,
} from '@/src/services/auth/phoneNumberHint';
import { consoleLogDev } from '@/src/utils/consoleLogDev';

// Indian mobile numbers must be 10 digits and start with 1, 2, 3, 4, 5, 6, 7, 8, or 9.
const INDIAN_PHONE_REGEX = /^[1-9]\d{9}$/;

function validatePhone(value: string): string {
  if (value.length === 0) return '';
  if (value.length < 10) return '';
  if (!INDIAN_PHONE_REGEX.test(value)) return 'Enter a valid 10-digit mobile number';
  return '';
}

export default function MobileVerificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [receiveWhatsappNotification, setReceiveWhatsappNotification] = useState(true);
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const isMountedRef = useRef(true);

  const isValidPhoneNumber = INDIAN_PHONE_REGEX.test(phoneNumber);

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(value);
    setError('');
    // Show validation error only once the user has typed the full 10 digits.
    setPhoneError(t(validatePhone(value)));
  }, [t]);

  useEffect(() => {
    let isActive = true;
    isMountedRef.current = true;

    const openPhoneNumberHint = async () => {
      const available = await isPhoneNumberHintAvailable();
      if (!available || !isActive) {
        consoleLogDev('[MobileVerification] SIM number auto hint skipped', {
          available,
          isActive,
        });
        return;
      }

      consoleLogDev('[MobileVerification] SIM number auto hint opening');

      try {
        const hintedPhoneNumber = await requestPhoneNumberHint();
        if (hintedPhoneNumber && isMountedRef.current) {
          consoleLogDev('[MobileVerification] SIM number applied', {
            length: hintedPhoneNumber.length,
          });
          handlePhoneChange(hintedPhoneNumber);
        } else {
          consoleLogDev('[MobileVerification] SIM number not applied');
        }
      } catch (hintError) {
        consoleLogDev('[MobileVerification] SIM number hint failed', hintError);
        // If the system picker is dismissed or unavailable, manual entry remains available.
      }
    };

    void openPhoneNumberHint();

    return () => {
      isActive = false;
      isMountedRef.current = false;
    };
  }, [handlePhoneChange]);

  const { mutate: requestOtp, isPending: isSending } = useMutation({
    mutationFn: authService.requestOtp,
    onSuccess: (response) => {
      
      if (!response.success) {
        setError(getApiErrorDisplayMessage(response.error) || t('Unable to send OTP. Please try again.'));
        return;
      }

      const params: Record<string, string> = { phoneNumber };
      if (response.data.requestId) {
        params.requestId = response.data.requestId;
      }
      if (response.data.otpLength != null) {
        params.otpLength = String(response.data.otpLength);
      }

      router.push({
        pathname: '/auth/otp-verification',
        params,
      });
    },
    onError: () => {
      setError(t('Unable to send OTP. Please try again.'));
    },
  });

  const handleNext = () => {
    if (isSending) return;
    if (!isValidPhoneNumber) {
      setPhoneError(t('Enter a valid 10-digit mobile number'));
      return;
    }
    setError('');
    setPhoneError('');
    void logAnalyticsEvent(ANALYTICS_EVENT.GET_OTP_BUTTON);
    requestOtp(
      receiveWhatsappNotification
        ? { phoneNumber, channel: 'whatsapp' }
        : { phoneNumber }
    );
  };

  return (
    <FormLayout
      header={<RupyaaLogo size="sm" style={styles.logo} />}
      contentContainerStyle={styles.formContent}
      footerStyle={styles.footer}
      keyboardAwareFooter
      footer={
        <>
          <ErrorContainer responseError={error} />
          <View style={styles.termsCheckboxContainer}>
            <View style={styles.termsCheckbox}>
              <AppText style={styles.termsCheckboxText} variant="caption" color="primary" weight='regular'>
                {t("By Clicking on the 'Get OTP' button, you agree to our")}{' '}
                <AppText variant="caption" style={styles.link} onPress={() => router.push('/privacy')}>{t('Privacy Policy')}</AppText> {t('and')}{' '}
                <AppText variant="caption" style={styles.link} onPress={() => router.push('/terms')}>{t('Terms & Conditions')}</AppText>
              </AppText>
            </View>
          </View>

          <Button
            variant="primary"
            size="large"
            fullWidth
            disabled={!isValidPhoneNumber || isSending || !receiveWhatsappNotification}
            loading={isSending}
            onPress={handleNext}
            rightIcon={
              <ArrowLeft
                size={16}
                color={colors.text.black}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            }
            style={styles.nextButton}
            textStyle={styles.nextButtonText}
          >
            {t('Get OTP')}
          </Button>
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <AppText style={styles.title} variant="h3" weight="bold">
            Verify mobile number
          </AppText>
          <AppText style={styles.subtitle} variant="caption" weight='regular' >
            Please enter your Aadhaar-linked mobile number
          </AppText>
        </View>
        <View style={styles.formContainer}>
          <AppText style={styles.phoneLabel} variant="caption" weight="semiBold">
            {t('Phone Number')}
          </AppText>
          <PhoneInput
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder=""
            autoFocus
            hasError={!!phoneError}
            errorMessage={phoneError}
            variant="underline"
            showCountryFlag
            compact
          />

          <View style={styles.checkboxContainer}>
            <Checkbox
              checked={receiveWhatsappNotification}
              onChange={setReceiveWhatsappNotification}
              style={styles.checkbox}
              checkedColor={colors.warning.light}
              checkColor={colors.text.inverse}
              size={20}
            >
              <View style={styles.whatsappLabel}>
                <AppText style={styles.whatsappLabelText} variant="caption">
                  {t('You agree to receive important updates about your loan on WhatsApp.')}
                  {'\u00A0'}
                  <Image
                    source={IMAGES.WHATSAPP_ICON}
                    style={styles.whatsappIconImage}
                    resizeMode="contain"
                  />
                </AppText>
              </View>
            </Checkbox>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  logo: {
    marginTop: spacing['4xl'],
  },
  titleContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
    fontSize: typography.fontSize['xl'],
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  subtitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.xxs * typography.lineHeight.normal,
  },
  errorContainer: {
    marginBottom: spacing.base,
    alignItems: 'center',
  },
  errorText: {
    color: colors.error.main,
  },
  formContainer: {
    gap: 0,
  },
  phoneLabel: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  checkboxContainer: {
    justifyContent: 'flex-start',
    marginTop: spacing.base,
  },
  checkbox: {
    // marginLeft: spacing.xs,
    // marginTop: spacing.xs,
    backgroundColor: 'transparent',
    // paddingHorizontal: spacing.base,
  },
  whatsappLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  whatsappLabelText: {
    flexShrink: 1,
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
  },
  whatsappIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsCheckboxContainer: {
    marginBottom: spacing.base,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsCheckboxText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xxs,
    lineHeight: typography.fontSize.xxs * typography.lineHeight.normal,
    flex: 1,
  },
  link: {
    color: colors.warning.main,
    textDecorationLine: 'underline',
    fontSize: typography.fontSize.xxs,
    lineHeight: typography.fontSize.xxs * typography.lineHeight.normal,
  },
  whatsappIconImage: {
    width: 12,
    height: 12,
    transform: [{ translateY: 2 }],
  },
  nextButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.warning.light,
    paddingVertical: 0,
  },
  nextButtonText: {
    color: colors.text.black,
    fontSize: typography.fontSize.base,
  },
});

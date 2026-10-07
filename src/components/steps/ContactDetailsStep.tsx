import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AppText } from '../AppText';
import { ControlledInput } from '../ControlledInput';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { VerifyOtpModal } from '../VerifyOtpModal';
import { PhonePrefix } from '../PhonePrefix';
import {
  createRegistrationSubmit,
  postContactDetails,
  handleRegistrationStepSuccess,
} from '@/src/services/registration';
import { userService } from '@/src/services/user/userService';
import { useFlowStore } from '@/src/store/useFlowStore';
import { contactDetailsSchema } from '@/src/utils/validation/kycSchemas';
import type { ContactDetails, PostContactDetailsRequest } from '@/src/types/kyc';
import type { StepProps } from '@/src/types/flow';
import { colors, radius, spacing } from '@/src/theme';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import {
  useScrollToFirstError,
  type ScrollViewScrollToFocusedInput,
} from '@/hooks/useScrollToFirstError';
import ErrorContainer from '../ErrorContainer';
import { appConfig } from '@/src/config/appConfig';
import { FLOW_CONFIG, FLOW_PHASES } from '@/src/config/flowSteps';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { useUserContactDetails } from '@/src/services/user/useUserContactDetails';
import { useUserDetailsStore } from '@/src/store';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import {
  pushLoanJourneyApiError,
  pushLoanJourneyUnknownError,
} from '@/src/services/logging/logPoolJourney';

const RESEND_COOLDOWN_SECONDS = 60;

type VerifyTarget = 'personal' | 'office';

type ContactDetailsFormData = z.input<typeof contactDetailsSchema>;

const CONTACT_FIELD_ORDER: (keyof ContactDetailsFormData)[] = [
  'email',
  'alternate_mobile',
  'officeEmail',
];

function mapContactDetailsToApi(form: ContactDetails): PostContactDetailsRequest {
  const payload: PostContactDetailsRequest = {
    email: form.email.trim(),
  };
  if (form.alternate_mobile?.trim()) {
    payload.alternate_mobile = form.alternate_mobile.trim();
  }
  if (form.officeEmail?.trim()) {
    payload.officeEmail = form.officeEmail.trim();
  }
  return payload;
}

const submitContactDetails = createRegistrationSubmit<
  ContactDetails,
  PostContactDetailsRequest
>({
  useMock: appConfig.useMockApi,
  mockSave: async () => {},
  mapToPayload: mapContactDetailsToApi,
  apiCall: postContactDetails,
});

export function ContactDetailsStep({ onNext, onPrev }: StepProps) {
  const phaseIndex = useFlowStore((s) => s.phaseIndex);
  const substepIndex = useFlowStore((s) => s.substepIndex);
  const safePhaseIndex = Math.max(0, Math.min(phaseIndex, FLOW_PHASES.length - 1));
  const currentPhase = FLOW_PHASES[safePhaseIndex];
  const phaseConfig = FLOW_CONFIG[currentPhase];
  const safeSubstepIndex = Math.max(
    0,
    Math.min(substepIndex, Math.max(phaseConfig.substeps.length - 1, 0))
  );
  const currentSubstep = phaseConfig.substeps[safeSubstepIndex];
  const isContactDetailsActive =
    currentPhase === 'kyc' && currentSubstep?.id === 'contact-details';

  const { data: contactDetailsResponse } = useUserContactDetails({
    enabled: isContactDetailsActive,
  });
  const personalDetails= useUserDetailsStore(s=>s.personalDetails ?? null);
  const contactDetails = contactDetailsResponse?.contactDetails;
  const contactFieldOptions = contactDetailsResponse?.contactFieldOptions ?? {};

  const [personalEmailVerified, setPersonalEmailVerified] = useState(false);
  const [officeEmailVerified, setOfficeEmailVerified] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<VerifyTarget | null>(null);
  const [otpRecipient, setOtpRecipient] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifySendError, setVerifySendError] = useState('');

  const currentStage: UserStage = UserStagesInBackend.CONTACT_DETAILS;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();

  const { submit, isPending, errorMessage, clearError } =
    useRegistrationSubmit<ContactDetails>({
      mutationFn: submitContactDetails,
      onSuccess: () => {
        void logAnalyticsEvent(ANALYTICS_EVENT.CONTACT_DETAIL_PAGE_SUBMIT);
        void handleRegistrationStepSuccess({
          currentStage,
          onNext,
          syncFromUserStage,
        });
      },
      onFailedResponse: handleFailedResponse,
    });

  const { control, handleSubmit, watch, trigger, reset, formState: { errors } } = useForm<ContactDetailsFormData>({
    resolver: zodResolver(contactDetailsSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      alternate_mobile: '',
      officeEmail: '',
    },
  });

  useEffect(() => {
    if (!contactDetails) return;
    reset({
      email: contactDetails.email ?? '',
      alternate_mobile: contactDetails.alternate_mobile ?? '',
      officeEmail: contactDetails.officeEmail ?? '',
    });
  }, [contactDetails, reset]);

  const emailValue = watch('email');
  const alternateMobileValue = watch('alternate_mobile');
  const officeEmailValue = watch('officeEmail');

  const showEmail = contactFieldOptions.personalEmail?.show !== false;
  const showOfficeEmail = contactFieldOptions.officeEmail?.show !== false;
  const showAlternateMobile = contactFieldOptions.alternateMobile?.show !== false;
  const isAlternateMobileRequired = showAlternateMobile && contactFieldOptions.alternateMobile?.required !== false;
  const officeEmailNeedsVerify = contactFieldOptions.officeEmail?.verify === true;
  const personalEmailNeedsVerify = contactFieldOptions.personalEmail?.verify === true;

  const hasPersonalEmail = Boolean(emailValue?.trim());
  const hasOfficeEmail = Boolean(officeEmailValue?.trim());
  const personalEmailValid = useMemo(() => {
    const v = emailValue?.trim() ?? '';
    if (!v) return false;
    return z.string().email().safeParse(v).success;
  }, [emailValue]);
  const officeEmailValid = useMemo(() => {
    const v = officeEmailValue?.trim() ?? '';
    if (!v) return false;
    return z.string().email().safeParse(v).success;
  }, [officeEmailValue]);
  const alternateMobileValid = useMemo(() => {
    const v = alternateMobileValue?.trim() ?? '';
    if (!v) return !isAlternateMobileRequired;
    return /^[6-9]\d{9}$/.test(v);
  }, [alternateMobileValue, isAlternateMobileRequired]);
  /** Show Verify link when field-level verify is enabled */
  const showPersonalEmailVerifyLink = showEmail && personalEmailNeedsVerify;
  /** Show Verify link when field-level verify is enabled */
  const showOfficeEmailVerifyLink = showOfficeEmail && officeEmailNeedsVerify;
  const emailInvalid = Boolean(errors.email);
  const officeEmailInvalid = Boolean(errors.officeEmail);

  // Revalidate email fields while typing after an error is shown (e.g. from Verify click).
  useEffect(() => {
    if (!errors.email) return;
    void trigger('email');
  }, [emailValue, errors.email, trigger]);

  useEffect(() => {
    if (!errors.officeEmail) return;
    void trigger('officeEmail');
  }, [officeEmailValue, errors.officeEmail, trigger]);

  // Reset verification status when email values change
  useEffect(() => {
    setPersonalEmailVerified(false);
  }, [emailValue]);

  useEffect(() => {
    setOfficeEmailVerified(false);
  }, [officeEmailValue]);

  // Continue button is disabled if any field with verify=true has a value but is not verified
  const canSubmit =
    (!personalEmailNeedsVerify || !hasPersonalEmail || personalEmailVerified) &&
    (!officeEmailNeedsVerify || !hasOfficeEmail || officeEmailVerified);

  // All required fields must be valid before proceeding
  const formValidForProceed =
    (!showEmail || personalEmailValid) &&
    alternateMobileValid &&
    (!showOfficeEmail || officeEmailValid);

  // Refs for input fields and scroll view (scroll behavior matches PersonalDetailsStep:
  // KeyboardAwareScrollView with enableAutomaticScroll scrolls to focused inputs)
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const alternateMobileRef = useRef<TextInput>(null);
  const officeEmailRef = useRef<TextInput>(null);

  const contactFieldRefs = useMemo(
    () => ({
      email: emailRef,
      alternate_mobile: alternateMobileRef,
      officeEmail: officeEmailRef,
    }),
    []
  );
  const onValidationError = useScrollToFirstError<ContactDetailsFormData>(
    CONTACT_FIELD_ORDER,
    contactFieldRefs,
    scrollViewRef as React.RefObject<ScrollViewScrollToFocusedInput | null>
  );

  // Validate email before moving to next field; user must have valid email before any action
  const focusNextFromEmail = useCallback(async () => {
    const isValid = await trigger('email');
    if (!isValid) return;

    if (showAlternateMobile) alternateMobileRef.current?.focus();
    else if (showOfficeEmail) officeEmailRef.current?.focus();
  }, [showAlternateMobile, showOfficeEmail, trigger]);

  const focusNextFromAlternateMobile = useCallback(async () => {
    const isValid = await trigger('alternate_mobile');
    if (!isValid) return;

    if (showOfficeEmail) officeEmailRef.current?.focus();
  }, [showOfficeEmail, trigger]);

  const handleOtpModalClose = useCallback(() => {
    setOtpModalVisible(false);
    setVerifyTarget(null);
    setOtpRecipient('');
    setOtp('');
    setOtpError('');
  }, []);

  // Mutation for sending OTP
  const sendOtpMutation = useMutation({
    mutationFn: userService.sendEmailOtp,
    onSuccess: (response) => {
      if (response.success) {
        setOtpError('');
        setOtp('');
        setVerifySendError('');
        setOtpModalVisible(true);
      } else {
        console.log('response.error.sendOtpMutation', response);
        const errorMsg =
          getApiErrorDisplayMessage(response.error) ||
          'Failed to send verification code. Please try again.';
        pushLoanJourneyApiError('contact details send email otp', response.error, response.status);
        setVerifySendError(errorMsg);
        setOtpError(errorMsg);
      }
    },
    onError: (error: Error, variables) => {
      console.error('[ContactDetailsStep] Exception sending OTP:', {
        email: variables.email,
        error,
      });
      pushLoanJourneyUnknownError('contact details send email otp', error);
      const errorMsg = error.message ?? 'Network error. Please try again.';
      setVerifySendError(errorMsg);
      // Also surface inside the OTP modal so the user sees resend failures
      setOtpError(errorMsg);
    },
  });

  // Mutation for verifying OTP
  const verifyOtpMutation = useMutation({
    mutationFn: userService.verifyEmailOtp,
    onSuccess: (response, variables) => {
      if (response.success) {
        if (verifyTarget === 'personal') setPersonalEmailVerified(true);
        else if (verifyTarget === 'office') setOfficeEmailVerified(true);
        handleOtpModalClose();
      } else {
        const errorMessage = getApiErrorDisplayMessage(response.error);
        console.log('errorMessage', errorMessage);
        pushLoanJourneyApiError(
          'contact details verify email otp',
          response.error,
          response.status
        );
        setOtpError(errorMessage ?? 'Verification failed. Please try again.');
      }
    },
    onError: (error: Error, variables) => {
      // Log unexpected errors
      console.log('[ContactDetailsStep] Exception verifying OTP:', {
        target: verifyTarget,
        email: variables.email,
        error,
      });
      pushLoanJourneyUnknownError('contact details verify email otp', error);
      const errorMessage = getApiErrorDisplayMessage({ message: error.message });
      setOtpError(errorMessage ?? 'Network error. Please try again.');
    },
  });

  const sendVerifyOtp = useCallback(
    async (target: VerifyTarget) => {
      const email = target === 'personal' ? emailValue?.trim() : officeEmailValue?.trim();
      if (!email) return;
      setVerifySendError('');
      setVerifyTarget(target);
      setOtpRecipient(email);
      sendOtpMutation.mutate({
        email,
        isPersonalMail: target === 'personal',
      });
    },
    [emailValue, officeEmailValue, sendOtpMutation]
  );

  const handleVerifyPersonalEmail = useCallback(async () => {
    const isValid = await trigger('email');
    if (!isValid) return;

    await sendVerifyOtp('personal');
  }, [trigger, sendVerifyOtp]);

  const handleVerifyOfficeEmail = useCallback(async () => {
    const isValid = await trigger('officeEmail');
    if (!isValid) return;
    await sendVerifyOtp('office');
  }, [trigger, sendVerifyOtp]);

  const renderVerifyAccessory = useCallback(
    (params: {
      onPress: () => void;
      isValid: boolean;
      isVerified: boolean;
      isPending: boolean;
    }) => {
      const { onPress, isValid, isVerified, isPending } = params;
      const disabled = !isValid || isPending || isVerified;
      const label = isPending ? 'Sending…' : isVerified ? '✓ Verified' : 'Verify';
      return (
        <TouchableOpacity
          style={styles.verifyLink}
          onPress={() => void onPress()}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <AppText
            style={[
              styles.verifyLinkText,
              isVerified && styles.verifiedText,
              disabled && !isVerified && styles.verifyLinkTextDisabled,
            ]}
            variant="caption"
            weight="medium"
          >
            {label}
          </AppText>
        </TouchableOpacity>
      );
    },
    []
  );

  const personalEmailRightAccessory = showPersonalEmailVerifyLink
    ? renderVerifyAccessory({
        onPress: handleVerifyPersonalEmail,
        isValid: personalEmailValid,
        isVerified: personalEmailVerified,
        isPending: sendOtpMutation.isPending,
      })
    : undefined;

  const officeEmailRightAccessory = showOfficeEmailVerifyLink
    ? renderVerifyAccessory({
        onPress: handleVerifyOfficeEmail,
        isValid: officeEmailValid,
        isVerified: officeEmailVerified,
        isPending: sendOtpMutation.isPending,
      })
    : undefined;

  const handleOtpModalResend = useCallback(() => {
    if (verifyTarget) void sendVerifyOtp(verifyTarget);
  }, [verifyTarget, sendVerifyOtp]);

  const handleOtpModalConfirm = useCallback(() => {
    if (!otp.trim()) {
      setOtpError('Please enter OTP.');
      return;
    }
    const email = otpRecipient;
    if (!email) {
      setOtpError('Email is required');
      return;
    }
    setOtpError('');
    verifyOtpMutation.mutate({
      email,
      otp: otp.trim(),
      isPersonalMail: verifyTarget === 'personal',
    });
  }, [otp, verifyTarget, otpRecipient, verifyOtpMutation]);

  const handleOtpChange = useCallback((value: string) => {
    setOtpError('');
    setOtp(value);
  }, []);

  const onSubmit = (data: ContactDetailsFormData) => {
    if (!canSubmit) return;
    clearError();
    const transformed = contactDetailsSchema.parse(data) as ContactDetails;
    submit(transformed);
  };

  return (
    <>
      <FormLayout
        showContactSupport
        ref={scrollViewRef}
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        keyboardAwareFooter
        footer={
          <>
            <ErrorContainer responseError={errorMessage} />
            <ErrorContainer responseError={verifySendError} />
            <Button
              variant="primary"
              size="large"
              fullWidth
              style={{ marginBottom: 0 }}
              disabled={!canSubmit || !formValidForProceed || isPending}
              loading={isPending}
              onPress={handleSubmit(onSubmit, onValidationError)}
            >
              Next →
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Contact Details
        </AppText>
        <View style={styles.content}>
          {showEmail && (
            <View style={styles.fieldBlock}>
              <ControlledInput
                inputRef={emailRef}
                control={control}
                name="email"
                label="Email"
                rightAccessory={personalEmailRightAccessory}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                required={showEmail}
                returnKeyType={showAlternateMobile || showOfficeEmail ? 'next' : 'done'}
                blurOnSubmit={!showAlternateMobile && !showOfficeEmail}
                onSubmitEditing={focusNextFromEmail}
              />
            </View>
          )}
          {showAlternateMobile && (
            <ControlledInput
              inputRef={alternateMobileRef}
              control={control}
              name="alternate_mobile"
              label="Alternate mobile"
              leftAccessory={<PhonePrefix />}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
              required={isAlternateMobileRequired}
              returnKeyType={showOfficeEmail ? 'next' : 'done'}
              blurOnSubmit={!showOfficeEmail}
              onSubmitEditing={focusNextFromAlternateMobile}
            />
          )}
          {showOfficeEmail && (
            <View style={styles.fieldBlock}>
              <ControlledInput
                inputRef={officeEmailRef}
                control={control}
                name="officeEmail"
                label="Office email"
                rightAccessory={officeEmailRightAccessory}
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                required={showOfficeEmail}
                returnKeyType="done"
              />
            </View>
          )}
        </View>
        <VerifyOtpModal
          visible={otpModalVisible}
          sentTo={otpRecipient}
          otpValue={otp}
          onOtpChange={handleOtpChange}
          onResend={handleOtpModalResend}
          onClose={handleOtpModalClose}
          onConfirm={handleOtpModalConfirm}
          error={otpError}
          resendCooldownSeconds={RESEND_COOLDOWN_SECONDS}
          disabled={isPending || verifyOtpMutation.isPending}
          loading={verifyOtpMutation.isPending}
        />
      </FormLayout>

    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    // marginBottom: spacing.base,
  },
  content: {
    paddingTop: spacing.base,
  },
  fieldBlock: {},
  verifyLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  verifyLinkText: {
    color: colors.primary.main,
  },
  verifyLinkTextDisabled: {
    color: colors.text.tertiary,
  },
  verifiedText: {
    color: colors.text.black,
  },
  verifyRequiredHint: {
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  otpError: {
    color: colors.error.main,
    marginBottom: spacing.sm,
  },
});

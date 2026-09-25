import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { SuccessModal } from '../SuccessModal';
import { ErrorModal } from '../ErrorModal';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import {
  createMandate,
  getMandateDetails,
  type MandateDetailsData,
} from '@/src/services/registration/mandateApi';
import { openCashfreeSubscriptionCheckout } from '@/src/services/payment';
import { handleRegistrationStepSuccess } from '@/src/services/registration/handleStepSuccess';
import {
  pushLoanJourneyApiError,
  pushLoanJourneyUnknownError,
} from '@/src/services/logging/logPoolJourney';
import { UserStagesInBackend } from '@/src/config/userStages';
import { useFlowStore } from '@/src/store/useFlowStore';
import { devConfig } from '@/src/config/dev';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import { IMAGES } from '@/src/constants/images';
import { SVG_ILLUSTRATIONS } from '@/src/constants/illustrations';
import { getApiErrorDisplayMessage, SUCCESS_MODAL_AUTO_NEXT_DELAY_MS } from '@/src/utils/common-helper';
import ErrorContainer from '../ErrorContainer';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';

const SUBTEXT =
  'To receive your loan amount, we need to activate automatic repayment from your bank as per your schedule';

const REASSURANCE_POINTS = [
  '100% secure and RBI-compliant',
  'Deductions only on your repayment date',
  'One-time setup',
] as const;

const BOTTOM_LINE =
  'By continuing, you agree to automatic repayment as per your loan schedule';

const CTA_LABEL = 'Set Up Auto-Payment';

type EnachScreen = 'form' | 'fetching_details' | 'success';

export function EnachStep({ onNext, onPrev }: StepProps): React.JSX.Element {
  const { isSimulating, simulatedState } = useStepSimulation();
  const [screen, setScreen] = useState<EnachScreen>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mandateDetails, setMandateDetails] = useState<MandateDetailsData | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const isMountedRef = useRef(true);
  const successAutoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);

  // Check if mandate registration failed based on status
  const isMandateRegistrationFailed = useCallback((details: MandateDetailsData | null): boolean => {
    const status = details?.registrationDetails?.status;
    return status === 'FAILED';
  }, []);

  // Handle error state when mandate fetch or registration fails
  const handleMandateError = useCallback((errorMessage: string, debugData?: unknown): void => {
    if (devConfig.enableDebugLogs && debugData) {
      console.log('[EnachStep] Mandate error:', JSON.stringify(debugData));
    }
    setMandateDetails(null);
    setErrorMessage(errorMessage);
    setScreen('form');
  }, []);

  // Handle success state when mandate is verified
  const handleMandateSuccess = useCallback((details: MandateDetailsData, responseData: unknown): void => {
    if (devConfig.enableDebugLogs) {
      console.log('[EnachStep] Mandate details:', JSON.stringify(responseData));
    }
    setMandateDetails(details);
    setScreen('success');
  }, []);

  const fetchMandateDetailsAndShow = useCallback(async (): Promise<void> => {
    setScreen('fetching_details');

    // getMandateDetails API commented out for now
    const response = await getMandateDetails();
    if (!isMountedRef.current) return;
    if (!response.success || !response.data) {
      if (!response.success) {
        pushLoanJourneyApiError('enach get mandate details', response.error, response.status);
      }
      const errorMessage = !response.success
        ? getApiErrorDisplayMessage(response.error) ?? 'Failed to verify mandate details. Please try again.'
        : 'Failed to verify mandate details. Please try again.';
      handleMandateError(errorMessage, response);
      return;
    }
    const details = response.data.data;
    if (isMandateRegistrationFailed(details)) {
      pushLoanJourneyUnknownError(
        'enach mandate registration',
        new Error('Mandate registration status is FAILED')
      );
      handleMandateError('Auto-Payment activation failed. Please try again.', details);
      return;
    }
    handleMandateSuccess(details, response.data);
  }, [isMandateRegistrationFailed, handleMandateError, handleMandateSuccess]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleProceed = useCallback(async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const response = await createMandate();

    if (!isMountedRef.current) return;

    if (!response.success) {
      pushLoanJourneyApiError('enach create mandate', response.error, response.status);
      setIsSubmitting(false);
      const message = getApiErrorDisplayMessage(response.error) ?? 'Something went wrong. Please try again.';
      setErrorMessage(message);
      return;
    }

    const { sessionId, subscriptionId } = response.data;

    // Second funnel moment after intro: user enters Cashfree mandate registration.
    void logAnalyticsEvent(ANALYTICS_EVENT.EMANDATE_REGISTRATION_PAGE_LAND);

    openCashfreeSubscriptionCheckout(sessionId, subscriptionId, {
      onVerify: (orderID: string) => {
        if (!isMountedRef.current) return;
        if (devConfig.enableDebugLogs) {
          console.log('[EnachStep] Cashfree onVerify — orderID:', orderID);
        }
        setIsSubmitting(false);
        setErrorMessage(null);
        void fetchMandateDetailsAndShow();
      },
      onError: (message: string) => {
        if (!isMountedRef.current) return;
        setIsSubmitting(false);
        pushLoanJourneyUnknownError(
          'enach cashfree checkout',
          new Error(message || 'Cashfree checkout failed')
        );
        if (devConfig.enableDebugLogs) {
          console.log('[EnachStep] Cashfree onError — message:', message);
        }
        console.log('[EnachStep] Cashfree onError — message:', message);
        // Cashfree checkout failed - show error and don't proceed
        // setErrorMessage(message);
      },
    });
  }, [isSubmitting, fetchMandateDetailsAndShow]);

  const handleContinueAfterSuccess = useCallback(async (): Promise<void> => {
    if (isAdvancing) return;
    setIsAdvancing(true);

    await handleRegistrationStepSuccess({
      currentStage: UserStagesInBackend.ENACH,
      onNext,
      syncFromUserStage,
    });

    if (isMountedRef.current) {
      setIsAdvancing(false);
    }
  }, [isAdvancing, onNext, syncFromUserStage]);

  const handleContinue = useCallback((): void => {
    void handleContinueAfterSuccess();
  }, [handleContinueAfterSuccess]);

  // Auto-advance on success (actual flow)
  useEffect(() => {
    if (screen !== 'success') return;
    successAutoNextTimerRef.current = setTimeout(() => {
      successAutoNextTimerRef.current = null;
      handleContinue();
    }, SUCCESS_MODAL_AUTO_NEXT_DELAY_MS);
    return () => {
      if (successAutoNextTimerRef.current) {
        clearTimeout(successAutoNextTimerRef.current);
        successAutoNextTimerRef.current = null;
      }
    };
  }, [screen, handleContinue]);

  // Dev simulation: auto-advance on success
  useEffect(() => {
    if (!isSimulating || simulatedState !== 'success') return;
    successAutoNextTimerRef.current = setTimeout(() => {
      successAutoNextTimerRef.current = null;
      onNext();
    }, SUCCESS_MODAL_AUTO_NEXT_DELAY_MS);
    return () => {
      if (successAutoNextTimerRef.current) {
        clearTimeout(successAutoNextTimerRef.current);
        successAutoNextTimerRef.current = null;
      }
    };
  }, [isSimulating, simulatedState, onNext]);

  // Dev simulation: loading, success, error
  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <FormLayout safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <AppText style={styles.loaderText} variant="body">
              Fetching mandate details…
            </AppText>
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'success') {
      return (
        <View style={styles.stepWrapper}>
          <FormLayout safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
            <View style={styles.content} />
          </FormLayout>
          <SuccessModal
            visible={true}
            title="Auto-Payment Activated"
            message="Your repayment mandate has been successfully set up. Redirecting to final agreement…"
            imageSource={IMAGES.ENACH_SUCCESS}
            renderAsOverlay
          />
        </View>
      );
    }
    if (simulatedState === 'error') {
      return (
        <View style={styles.stepWrapper}>
          <FormLayout safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
            <View style={styles.content} />
          </FormLayout>
          <ErrorModal
            visible={true}
            title="E-NACH authorization failed"
            message="Please try again."
            renderAsOverlay
            onRetry={handleProceed}
            retryLabel="Retry"
          />
        </View>
      );
    }
  }

  if (screen === 'fetching_details') {
    return (
      <FormLayout safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <AppText style={styles.loaderText} variant="body">
            Fetching mandate details…
          </AppText>
        </View>
      </FormLayout>
    );
  }

  if (screen === 'success') {
    return (
      <View style={styles.stepWrapper}>
        <FormLayout safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.content} />
        </FormLayout>
        <SuccessModal
          visible={true}
          title="Auto-Payment Activated"
          message="Your repayment mandate has been successfully set up. Redirecting to final agreement…"
          imageSource={IMAGES.ENACH_SUCCESS}
          renderAsOverlay
        />
      </View>
    );
  }

  return (
    <FormLayout
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={
        <>
          <ErrorContainer responseError={errorMessage ?? ''} />
          
          <AppText style={styles.disclaimer} variant="captionSmall" color="textprimary">
            {BOTTOM_LINE}
          </AppText>

          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleProceed}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.proceedButton}
          >
            {CTA_LABEL}
          </Button>
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <SvgXml
            xml={SVG_ILLUSTRATIONS.ENACH_SHIELD}
            width={80}
            height={80}
            accessibilityLabel="Secure auto-payment"
          />
        </View>
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Set Up Auto-Payment for Your Loan
        </AppText>
        <View style={styles.infoCard}>
          <AppText style={styles.subtext} variant="body">
            {SUBTEXT}
          </AppText>
          <AppText style={styles.benefitsTitle} variant="caption" weight="semiBold">
            Benefits of E-Nach :
          </AppText>
          <View style={styles.reassuranceList}>
            {REASSURANCE_POINTS.map((point) => (
              <View key={point} style={styles.reassuranceRow}>
                <AppText style={styles.bullet} variant="body" weight="bold">
                  •
                </AppText>
                <AppText style={styles.reassuranceText} variant="caption">
                  {point}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  stepWrapper: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.lg,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subtext: {
    color: colors.text.primary,
    marginBottom: spacing.xl,
    lineHeight: 22,
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: colors.primary.lightest_2,
    borderRadius: 12,
    padding: spacing.base,
  },
  reassuranceList: {
    marginBottom: 0,
  },
  benefitsTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bullet: {
    color: colors.text.black,
    marginRight: spacing.sm,
  },
  reassuranceText: {
    color: colors.text.primary,
    flex: 1,
    minWidth: 0,
  },
  disclaimer: {
    color: colors.text.primary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error.main,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  proceedButton: {
    marginBottom: spacing.sm,
  },
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loaderText: {
    color: colors.text.secondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontSize: 18,
  },
});

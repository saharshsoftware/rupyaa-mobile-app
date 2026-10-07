import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { ContactSupport } from '../ContactSupport';
import { FormLayout } from '../FormLayout';
import ErrorContainer from '../ErrorContainer';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import {
  executeSoftPullFlow,
} from '@/src/services/registration/softPullFlow';
import { useFlowStore } from '@/src/store/useFlowStore';
import { navigateToPhaseSubstep } from '@/src/services/navigation/stepNavigation';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import { ZapcashLoading } from '../ZapcashLoading';
import { GIF_VIDEOS, IMAGES } from '@/src/constants/images';
import { commonStyles } from '@/src/utils/common-styles';
import { ImageStyle } from 'react-native';
import { logPoolMessages } from '@/src/services/logging';
import { pushLoanJourneyLog } from '@/src/services/logging/logPoolJourney';
import { consoleLogDev } from '@/src/utils/common-helper';
import { SoftPullFlowError } from '@/src/types/loans';

const DEFAULT_ERROR_MESSAGE = 'Unable to verify eligibility. Please try again.';

/**
 * SOFT_PULL Step: Eligibility check and offer retrieval.
 * 
 * Flow:
 * 1. Calls GET /user/get-user-eligibility-experian until approved (or rejected)
 * 2. Syncs backend stage via GET /user/get-user-stage
 * 3. If rejected: shows error (user not eligible - cannot retry)
 * 4. Resolves current offer (from synced stage or GET /offer/current-offer fallback)
 * 5. If offer exists: navigates to ApprovedOfferStep
 * 6. If no offer: navigates to bank statement form (offer phase, substep 0 - bank-connect)
 * 
 * All flow logic is centralized in executeSoftPullFlow() for single source of truth.
 */
export function SoftPullStep({ onNext, onPrev }: StepProps) {
  const { isSimulating, simulatedState } = useStepSimulation();
  const [isLoading, setIsLoading] = useState(true);
  const [softPullError, setSoftPullError] = useState<SoftPullFlowError | null>(null);

  const didAdvanceRef = useRef(false);
  const isMountedRef = useRef(true);

  const { goTo } = useFlowStore();
  const { handleFailedResponse } = useIneligibilityModal();

  /**
   * When offer exists: OfferStatusModal is already opened by executeSoftPullFlow (with the correct variant).
   * When no offer: navigate to bank-connect step.
   */
  const advanceToNextStep = useCallback(
    (nextAction: 'offer' | 'bank-statement') => {
      consoleLogDev('[SoftPullStep] advanceToNextStep called:', { nextAction, didAdvanceAlready: didAdvanceRef.current });
      if (didAdvanceRef.current) return;
      didAdvanceRef.current = true;

      if (nextAction === 'offer') {
        // Modal already opened by executeSoftPullFlow with the resolved variant.
        consoleLogDev('[SoftPullStep] Offer modal already opened by softPullFlow');
      } else {
        navigateToPhaseSubstep({
          goTo,
          phase: 'offer',
          substepId: 'bank-connect',
          source: 'SoftPullStep',
        });
      }
    },
    [goTo]
  );

  /**
   * Execute soft pull flow: eligibility check + offer retrieval.
   * Single source of truth for all flow logic.
   */
  const runSoftPullFlow = useCallback(async () => {
    setSoftPullError(null);
    setIsLoading(true);

    try {
      const result = await executeSoftPullFlow();
      consoleLogDev('[SoftPullStep] executeSoftPullFlow result:', {
        success: result.success,
        nextAction: result.success ? result.nextAction : undefined,
        errorType: !result.success ? result.error?.type : undefined,
      });
      // Guard: component unmounted during async operation
      if (!isMountedRef.current) return;
      if (!result.success) {
        // When the API explicitly flags isEligible: false, show IneligibilityModal
        // (full-screen overlay managed by LoanWizard) instead of the inline error.
        const hasFalseIneligibility = result.error.isIneligible === false;
        if (hasFalseIneligibility) {
          handleFailedResponse({
            success: false,
            error: {
              message: result.error.message,
              code: 'ELIGIBILITY_REJECTED',
              details: { isEligible: false },
            },
          });
          setIsLoading(false);
          return;
        }

        // All other failures (network errors, retryable checks) show inline error.
        pushLoanJourneyLog((phoneNumber) =>
          logPoolMessages.softpullError(
            phoneNumber,
            `${result.error.type}: ${result.error.message}`
          )
        );
        setSoftPullError(result.error);
        setIsLoading(false);
        return;
      }

      // Flow succeeded: navigate to next step based on result
      setIsLoading(false);
      if (result.nextAction) {
        advanceToNextStep(result.nextAction);
      } else {
        // Fallback: if no nextAction, move to default next step
        onNext();
      }
    } catch {
      // Unexpected error: show generic message and allow retry
      if (!isMountedRef.current) return;
      setSoftPullError({
        type: 'UNEXPECTED',
        message: DEFAULT_ERROR_MESSAGE,
        canRetry: true,
      });
      setIsLoading(false);
    }
  }, [advanceToNextStep, onNext, handleFailedResponse]);

  // Auto-run flow on mount
  useEffect(() => {
    isMountedRef.current = true;
    void runSoftPullFlow();
    return () => {
      isMountedRef.current = false;
    };
  }, [runSoftPullFlow]);

  const handleRetry = useCallback(() => {
    // Reset navigation guard to allow retry
    didAdvanceRef.current = false;
    void runSoftPullFlow();
  }, [runSoftPullFlow]);

  const hasError = softPullError != null && !isLoading;
  const errorMessage =
    hasError ? softPullError?.message ?? DEFAULT_ERROR_MESSAGE : '';

  // Dev simulation: show loading or error UI without running real flow
  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.content}>
            <AppText style={styles.title} variant="h3" weight="semiBold">
              Checking your eligibility
            </AppText>
            <AppText style={styles.subtitle} variant="body">
              Checking your eligibility and fetching offers...
            </AppText>
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
            </View>
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'error') {
      return (
        <FormLayout
          showContactSupport
          safeAreaEdges={['bottom']}
          onBack={onPrev}
          footer={
            <Button variant="primary" size="large" fullWidth disabled={false}>
              Retry
            </Button>
          }
        >
          <View style={styles.content}>
            <AppText style={styles.title} variant="h3" weight="semiBold">
              Checking your eligibility
            </AppText>
            <ErrorContainer responseError={DEFAULT_ERROR_MESSAGE} />
          </View>
        </FormLayout>
      );
    }
  }

  const renderLoading = () => {
    if (isLoading) {
      return (
        <>
        {/* <View style={styles.loaderContainer}> */}
          <ZapcashLoading
            visible={true}
            title="Checking Your Loan Eligibility"
            message="We're securely reviewing your details to find the best offer for you. This usually takes a few seconds"
            source="SoftPullStep"
            reassuranceText="Your information is safe and encrypted"
            />
        {/* </View> */}
            </>
      )
    }
  }

  return (
    <FormLayout
      showContactSupport={!hasError}
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={<View />}
    >
      <View style={styles.content}>
        {hasError ? (
          <View style={styles.errorContent}>
            <Image source={IMAGES.RETRY} style={commonStyles.image as ImageStyle} />
            <AppText style={styles.title} variant="h3" weight="semiBold">
              Something went wrong
            </AppText>
            <AppText style={styles.errorMessage} variant="body">
              {errorMessage}
            </AppText>
            <ContactSupport />
            {softPullError?.canRetry && (
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={handleRetry}
                disabled={isLoading}
              >
                Retry
              </Button>
            )}
          </View>
        ) : (
          renderLoading()
        )}
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.base,
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorMessage: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

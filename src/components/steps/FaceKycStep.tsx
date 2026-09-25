import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FaceKycIllustration } from '../FaceKycIllustration';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { FullScreenModal } from '../FullScreenModal';
import { ConfirmationModal } from '../ConfirmationModal';
import ErrorContainer from '../ErrorContainer';
import { HyperKYCFace, type HyperKycResult } from '../HyperKYCFace';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing, radius } from '@/src/theme';
import { getHyperKycWorkflowId, getHyperKycSdkVersion } from '@/src/config/resolvedAppConfig';
import { useHyperKycAccessToken } from '@/src/services/kyc/hyperkyc';
import { useAdhaarImage } from '@/src/services/kyc/adhaarImage';
import { externalService } from '@/src/services/external/externalService';
import { userService } from '@/src/services/user/userService';
import { useFlowStore } from '@/src/store/useFlowStore';
import { applyUserStageResultToStore } from '@/src/services/user/useUserStage';
import {
  logHyperKycResult,
  pushLoanJourneyApiError,
  pushLoanJourneyUnknownError,
} from '@/src/services/logging/logPoolJourney';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import { IMAGES } from '@/src/constants/images';
import { commonStyles } from '@/src/utils/common-styles';
import { ZapcashLoading } from '../ZapcashLoading';
import { windowHeight, SUCCESS_MODAL_AUTO_NEXT_DELAY_MS } from '@/src/utils/common-helper';
import { SuccessModal } from '../SuccessModal';
import { ErrorModal } from '../ErrorModal';
/** Tracks the current screen within the face verification flow. */
type FaceKycScreen = 'intro' | 'verifying' | 'success';

const DEFAULT_SUCCESS_MESSAGE = {
  title: 'Face Verified!',
  subtitle: 'Your identity has been verified successfully.',
};

const NEEDS_REVIEW_SUCCESS_MESSAGE = {
  title: 'Under Review',
  subtitle: 'Your verification is under review. We will notify you once it is complete.',
};
const HYPER_KYC_POLL_INTERVAL_MS = 5000;
const HYPER_KYC_MAX_POLL_ATTEMPTS = 24;
const FACE_KYC_SYNC_CANCELLED = '__FACE_KYC_SYNC_CANCELLED__';
const DEFAULT_POLLING_MESSAGE = 'KYC not approved yet';
const POLLING_TIMEOUT_MESSAGE =
  'KYC approval is taking longer than expected. Please try again in a few minutes.';
const PENDING_STATUS_SET = new Set([
  'pending',
  'in_progress',
  'processing',
  'under_review',
  'queued',
  'created',
]);
const FAILURE_STATUS_SET = new Set([
  'rejected',
  'declined',
  'failed',
  'error',
  'cancelled',
  'auto_declined',
]);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function classifyHyperKycApiResult(payload: {
  success?: boolean;
  message?: string;
  data?: { applicationStatus?: string };
}): { state: 'ready' | 'pending' | 'failed'; message?: string } {
  const rawMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
  const normalizedMessage = rawMessage.toLowerCase();
  const rawStatus =
    typeof payload.data?.applicationStatus === 'string'
      ? payload.data.applicationStatus.trim()
      : '';
  const normalizedStatus = rawStatus.toLowerCase();

  if (normalizedStatus && FAILURE_STATUS_SET.has(normalizedStatus)) {
    return {
      state: 'failed',
      message: rawMessage || 'Face verification was not approved.',
    };
  }

  if (normalizedStatus && PENDING_STATUS_SET.has(normalizedStatus)) {
    return {
      state: 'pending',
      message: rawMessage || DEFAULT_POLLING_MESSAGE,
    };
  }

  if (payload.success === false) {
    if (
      normalizedMessage &&
      /(rejected|declined|failed|error|cancelled)/i.test(normalizedMessage) &&
      !/not approved yet/i.test(normalizedMessage)
    ) {
      return {
        state: 'failed',
        message: rawMessage,
      };
    }
    return {
      state: 'pending',
      message: rawMessage || DEFAULT_POLLING_MESSAGE,
    };
  }

  if (/not approved yet/i.test(normalizedMessage)) {
    return {
      state: 'pending',
      message: rawMessage || DEFAULT_POLLING_MESSAGE,
    };
  }

  return { state: 'ready' };
}

/**
 * Face KYC step — guides the user through a selfie-based identity
 * verification to match their face against their KYC documents.
 */
export function FaceKycStep({ onNext, onPrev }: StepProps) {
  const { isSimulating, simulatedState } = useStepSimulation();
  const [screen, setScreen] = useState<FaceKycScreen>('intro');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncingResult, setIsSyncingResult] = useState(false);
  const [isFetchingLoanId, setIsFetchingLoanId] = useState(false);
  const [responseError, setResponseError] = useState('');
  const [syncStatusMessage, setSyncStatusMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [successMessage, setSuccessMessage] = useState(DEFAULT_SUCCESS_MESSAGE);
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const setShowDashboard = useFlowStore((s) => s.setShowDashboard);
  const {
    data: accessTokenResponse,
    isLoading: isLoadingAccessToken,
    isFetching: isFetchingAccessToken,
    error: accessTokenError,
    refetch: refetchAccessToken,
  } = useHyperKycAccessToken(false);
  const {
    data: adhaarImageResponse,
    isLoading: isLoadingAdhaarImage,
    isFetching: isFetchingAdhaarImage,
    refetch: refetchAdhaarImage,
  } = useAdhaarImage(false);

  /** Prevents accidental double-advance when the timer fires. */
  const didAdvanceRef = useRef(false);
  /** Guards async polling updates against stale/unmounted runs. */
  const syncRunIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const successAutoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accessToken = accessTokenResponse?.token || '';
  const workflowId = getHyperKycWorkflowId();
  const sdkVersion = getHyperKycSdkVersion();
  const hasValidConfig = Boolean(accessToken && workflowId && transactionId && sdkVersion);
  const isPreparingVerificationContent =
    isLoadingAccessToken ||
    isFetchingAccessToken ||
    isLoadingAdhaarImage ||
    isFetchingAdhaarImage;
  const accessTokenErrorMessage =
    accessTokenError instanceof Error
      ? accessTokenError.message
      : 'Failed to fetch HyperKYC access token. Please try again.';

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      syncRunIdRef.current += 1;
    };
  }, []);

  const ensureRunIsActive = useCallback((runId: number): void => {
    if (!isMountedRef.current || syncRunIdRef.current !== runId) {
      throw new Error(FACE_KYC_SYNC_CANCELLED);
    }
  }, []);

  const isCancelledSyncError = useCallback((error: unknown): boolean => {
    return error instanceof Error && error.message === FACE_KYC_SYNC_CANCELLED;
  }, []);

  const handleStartVerification = useCallback((): void => {
    syncRunIdRef.current += 1;
    setResponseError('');
    setSyncStatusMessage('');
    setSuccessMessage(DEFAULT_SUCCESS_MESSAGE);
    setIsSyncingResult(false);
    setIsFetchingLoanId(true);
    setIsModalOpen(false);
    setTransactionId('');

    void (async () => {
      try {
        const [loanIdResponse] = await Promise.all([
          externalService.getLoanId(),
          refetchAccessToken(),
          refetchAdhaarImage(),
        ]);
        if (
          !loanIdResponse.success ||
          loanIdResponse.data?.success === false ||
          !loanIdResponse.data?.loanId
        ) {
          const errorMessage = 'Failed to fetch loan id. Please try again.';
          throw new Error(errorMessage);
        }

        setTransactionId(loanIdResponse.data.loanId);
        setScreen('verifying');
        setIsModalOpen(true);
      } catch (error) {
        pushLoanJourneyUnknownError('face kyc loan id', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch loan id. Please try again.';
        setResponseError(errorMessage);
        setScreen('intro');
      } finally {
        setIsFetchingLoanId(false);
      }
    })();
  }, [refetchAccessToken, refetchAdhaarImage]);

  const handleCloseModal = useCallback((): void => {
    if (isSyncingResult) return;
    setIsModalOpen(false);
    setSyncStatusMessage('');
    setScreen((currentScreen) => (currentScreen === 'verifying' ? 'intro' : currentScreen));
  }, [isSyncingResult]);

  const syncHyperKycResultAndUserStage = useCallback(
    async (runId: number): Promise<void> => {
      for (let attempt = 1; attempt <= HYPER_KYC_MAX_POLL_ATTEMPTS; attempt += 1) {
        ensureRunIsActive(runId);

        const hyperKycResultResponse = await externalService.getHyperKycApiResults();
        ensureRunIsActive(runId);

        if (!hyperKycResultResponse.success) {
          if (attempt === HYPER_KYC_MAX_POLL_ATTEMPTS) {
            throw new Error(
              hyperKycResultResponse.error?.message ||
              'Failed to sync HyperKYC result. Please try again.'
            );
          }
          const retryMessage =
            hyperKycResultResponse.error?.message || 'Unable to sync verification. Retrying…';
          setSyncStatusMessage(`${retryMessage} Retrying in 5 seconds…`);
          await delay(HYPER_KYC_POLL_INTERVAL_MS);
          continue;
        }

        const classification = classifyHyperKycApiResult(hyperKycResultResponse.data ?? {});
        if (classification.state === 'failed') {
          throw new Error(classification.message || 'Face verification was not approved.');
        }

        if (classification.state === 'pending') {
          if (attempt === HYPER_KYC_MAX_POLL_ATTEMPTS) {
            throw new Error(classification.message || POLLING_TIMEOUT_MESSAGE);
          }
          const pendingMessage = classification.message || DEFAULT_POLLING_MESSAGE;
          setSyncStatusMessage(`${pendingMessage} Retrying in 5 seconds…`);
          await delay(HYPER_KYC_POLL_INTERVAL_MS);
          continue;
        }

        setSyncStatusMessage('Fetching your latest application stage…');
        const userStageResponse = await userService.getUserStage();
        ensureRunIsActive(runId);

        if (!userStageResponse.success) {
          pushLoanJourneyApiError(
            'face kyc get user stage',
            userStageResponse.error,
            userStageResponse.status
          );
          throw new Error(
            userStageResponse.error?.message || 'Failed to fetch updated user stage. Please try again.'
          );
        }

        applyUserStageResultToStore(userStageResponse.data);
        if (userStageResponse.data?.stage) {
          syncFromUserStage(
            userStageResponse.data.stage,
            userStageResponse.data.sectionsCompleted,
            userStageResponse.data.context
          );
        }
        return;
      }

      throw new Error(POLLING_TIMEOUT_MESSAGE);
    },
    [ensureRunIsActive, setShowDashboard, syncFromUserStage]
  );

  const handleHyperKycResult = useCallback((result: HyperKycResult) => {
    logHyperKycResult(result.status, result.code);
    if (result.status === 'auto_declined') {
      setResponseError(result.message || 'Face verification failed. Please try again.');
      setIsModalOpen(false);
      setScreen('intro');
      return;
    }
    if (result.status === 'auto_approved' || result.status === 'needs_review') {
      const message =
        result.status === 'needs_review' ? NEEDS_REVIEW_SUCCESS_MESSAGE : DEFAULT_SUCCESS_MESSAGE;
      const runId = syncRunIdRef.current + 1;
      syncRunIdRef.current = runId;

      setResponseError('');
      setIsSyncingResult(true);
      setSyncStatusMessage('Finalizing face verification…');
      void (async () => {
        try {
          await syncHyperKycResultAndUserStage(runId);
          ensureRunIsActive(runId);
          setSuccessMessage(message);
          setScreen('success');
          setIsModalOpen(false);
        } catch (error) {
          if (isCancelledSyncError(error)) return;
          pushLoanJourneyUnknownError('face kyc sync', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Unable to complete face verification. Please try again.';
          setResponseError(errorMessage);
          setIsModalOpen(false);
          setScreen('intro');
        } finally {
          if (syncRunIdRef.current !== runId || !isMountedRef.current) return;
          setIsSyncingResult(false);
          setSyncStatusMessage('');
        }
      })();
      return;
    }

    if (result.status === 'user_cancelled') {
      setIsModalOpen(false);
      setScreen('intro');
      return;
    }

    const errorMessage =
      result.message ||
      (result.raw && typeof result.raw === 'object' && 'errorMessage' in result.raw
        ? String(result.raw.errorMessage)
        : 'An error occurred during verification. Please try again.');
    setResponseError(errorMessage);
    setIsModalOpen(false);
    setScreen('intro');
  }, [ensureRunIsActive, isCancelledSyncError, syncHyperKycResultAndUserStage]);

  const handleHyperKycError = useCallback(
    (error: { message: string; raw?: unknown }) => {
      console.log('handleHyperKycError', error);

      pushLoanJourneyUnknownError(
        'face kyc webview',
        new Error(error.message || 'HyperKYC WebView failed')
      );
      setResponseError(error.message || 'An error occurred while loading the verification.');
      setSyncStatusMessage('');
      handleCloseModal();
    },
    [handleCloseModal]
  );

  const faceKycModal = (
    <FullScreenModal
      visible={isModalOpen}
      onClose={handleCloseModal}
      hideHeader={true}
    // title="Face KYC"
    // subtitle="Complete your selfie verification"
    >
      {isSyncingResult ? (
        <View style={styles.modalLoading}>
          <ZapcashLoading
            visible={true}
            title="Fetching your kyc"
            message="We're fetching your kyc status. This may take a few seconds."
            source="DigilockerStep"
          />
        </View>
      ) : isPreparingVerificationContent ? (
        <View style={styles.modalLoading}>
          <ZapcashLoading
            visible={true}
            title="Preparing face verification…"
            message="Please wait while we prepare your face verification."
            source="FaceKycStep"
          />
        </View>
      ) : accessTokenError ? (
        <View style={styles.modalError}>
          <AppText style={styles.modalErrorTitle} variant="body" weight="semiBold">
            Unable to start verification
          </AppText>
          <AppText style={styles.modalErrorSubtitle} variant="caption">
            {accessTokenErrorMessage}
          </AppText>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={() => {
              refetchAccessToken();
              refetchAdhaarImage();
            }}
          >
            Retry
          </Button>
          <Button
            variant="outline"
            size="large"
            fullWidth
            onPress={handleCloseModal}
          >
            Close
          </Button>
        </View>
      ) : !hasValidConfig ? (
        <View style={styles.modalError}>
          <AppText style={styles.modalErrorTitle} variant="body" weight="semiBold">
            Configuration Error
          </AppText>
          <AppText style={styles.modalErrorSubtitle} variant="caption">
            HyperKYC configuration is missing. Please contact support.
          </AppText>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleCloseModal}
          >
            Close
          </Button>
        </View>
      ) : (
        <HyperKYCFace
          accessToken={accessToken}
          workflowId={workflowId}
          transactionId={transactionId}
          sdkVersion={sdkVersion}
          showLandingPage
          inputImage={adhaarImageResponse?.imageLink}
          onResult={handleHyperKycResult}
          onError={handleHyperKycError}
          style={styles.hyperKycContainer}
        />
      )}
    </FullScreenModal>
  );

  /** Advances to the next flow step exactly once. */
  const handleContinue = (): void => {
    if (didAdvanceRef.current) return;
    didAdvanceRef.current = true;
    onNext();
  };

  const handleSuccessConfirm = useCallback(() => {
    if (successAutoNextTimerRef.current) {
      clearTimeout(successAutoNextTimerRef.current);
      successAutoNextTimerRef.current = null;
    }
    handleContinue();
  }, []);

  const handleSuccessClose = useCallback(() => {
    if (successAutoNextTimerRef.current) {
      clearTimeout(successAutoNextTimerRef.current);
      successAutoNextTimerRef.current = null;
    }
    handleContinue();
  }, []);

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
  }, [screen]);

  // Dev simulation: auto-advance on success (mirrors actual flow)
  useEffect(() => {
    if (!isSimulating || simulatedState !== 'success') return;
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
  }, [isSimulating, simulatedState]);

  // Dev simulation: show success, error, or loading UI without API
  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <FormLayout safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.loadingContainer}>
            {/* <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <AppText style={styles.verifyingSubtitle} variant="body">
                Preparing face verification…
              </AppText>
            </View> */}

            <ZapcashLoading
              visible={true}
              title="Preparing face verification…"
              message="Please wait while we prepare your face verification. This may take a few seconds."
              source="FaceKycStep"
            />
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'success') {
      return (
        <>
          <SuccessModal
            visible={true}
            title="Identity Verified Successfully"
            message="Your KYC verification is complete"
            imageSource={IMAGES.FACE_KYC_SUCCESS}
            renderAsOverlay
          />
        </>
      );
    }
    if (simulatedState === 'error') {
      return (
        <>
          <ErrorModal
            visible={true}
            title="Unable to start verification"
            message="An error occurred while loading the verification."
            renderAsOverlay
            onRetry={handleStartVerification}
            retryLabel="Retry"
          />
        </>
      );
    }
  }

  // ─── Success screen: bottom sheet + auto-advance ──────────────────
  if (screen === 'success') {
    return (
      <>
        <SuccessModal
          visible={true}
          title="Identity Verified Successfully"
          message="Your KYC verification is complete"
          imageSource={IMAGES.FACE_KYC_SUCCESS}
          renderAsOverlay
        />
      </>

    );
  }

  // ─── Intro / instructions screen (default) ─────────────────────
  return (
    <FormLayout
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={
        <Button
          variant="primary"
          size="large"
          fullWidth
          loading={isFetchingLoanId}
          disabled={isFetchingLoanId}
          onPress={handleStartVerification}
          // leftIcon={
          //   <Ionicons name="camera" size={18} color={colors.text.inverse} />
          // }
        >
          Start Face Verification
        </Button>
      }
    >
      <View style={styles.content}>
        <AppText style={styles.title} variant="h3" weight="semiBold">
          Complete Your Face KYC
        </AppText>
        <AppText style={styles.subtitle} variant="body">
          Take a clear selfie to verify your identity
        </AppText>
        <ErrorContainer responseError={responseError} />

        {/* Face scan illustration card */}
        <View style={styles.card}>
          <View style={styles.cardIconWrapper}>
            <FaceKycIllustration
              width={108}
              height={108}
              accessibilityLabel="Face verification"
            />
          </View>
          <AppText style={styles.cardTitle} variant="h4" weight="semiBold">
            Quick Selfie Verification
          </AppText>
          <AppText style={styles.cardDescription} variant="body">
            Position your face within the frame and hold still for a few
            seconds. Make sure you&apos;re in a well-lit area
          </AppText>
        </View>

        {/* Tips / instructions */}
        <AppText style={styles.tipsHeading} variant="body" weight="semiBold">
          Tips for a smooth verification
        </AppText>
        <View style={styles.tipsSection}>
          <TipItem icon="sunny-outline" text="Find a well-lit area — avoid backlighting" />
          <TipItem icon="glasses-outline" text="Remove glasses, hats, or face coverings" />
          <TipItem icon="phone-portrait-outline" text="Hold your phone at eye level" />
          <TipItem icon="happy-outline" text="Keep a neutral expression and look straight" />
        </View>
      </View>
      {faceKycModal}
    </FormLayout>
  );
}

// ─── Reusable tip bullet ────────────────────────────────────────────
function TipItem({ icon, text }: { icon: string; text: string }): React.JSX.Element {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIconBg}>
        <Ionicons name={icon as any} size={18} color={colors.primary.main} />
      </View>
      <AppText style={styles.tipText} variant="caption">
        {text}
      </AppText>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xs,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    minHeight: windowHeight * 0.6,
    height: '100%',
    backgroundColor: colors.background.primary,
  },
  subtitle: {
    color: colors.text.gray,
    lineHeight: 16,
    fontSize: 12,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },

  /* Intro card */
  card: {
    minHeight: 192,
    backgroundColor: colors.primary.lightest_3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary.main,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  cardIconWrapper: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.text.primary,
    lineHeight: 30,
    marginBottom: 0,
    textAlign: 'center',
  },
  cardDescription: {
    width: '100%',
    maxWidth: 340,
    color: colors.text.gray,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  /* Tips section */
  tipsHeading: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontSize: 20,
  },
  tipsSection: {
    gap: spacing.md,
    fontSize: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipIconBg: {
    width: 36,
    height: 36,
    borderRadius:20,
    backgroundColor: colors.primary.lightest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    color: colors.text.secondary,
    flex: 1,
    fontSize: 13,
  },

  /* Verifying screen */
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    minHeight: 300,
  },
  faceOval: {
    width: 160,
    height: 200,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.primary.main,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.primary.lightest,
  },
  verifyingTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  verifyingSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
  },

  /* Success screen */
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  modalLoadingText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalError: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  modalErrorTitle: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalErrorSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  hyperKycContainer: {
    flex: 1,
  },
});

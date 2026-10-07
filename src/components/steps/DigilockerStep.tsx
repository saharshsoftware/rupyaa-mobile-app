import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ContactSupport } from '../ContactSupport';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { Digilocker } from '../Digilocker';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing, radius } from '@/src/theme';
import { initiateDigilocker, useDigilockerStatus } from '@/src/services/kyc/digilocker';
import { errorHandler, getApiErrorDisplayMessage, SUCCESS_MODAL_AUTO_NEXT_DELAY_MS } from '@/src/utils/common-helper';
import { FullScreenModal } from '../FullScreenModal';
import { ConfirmationModal } from '../ConfirmationModal';
import { useInteractionReady } from '@/src/hooks/useInteractionReady';
import type { DigilockerSuccessPayload } from '@/src/types/webview';
import { IMAGES } from '@/src/constants/images';
import ErrorContainer from '../ErrorContainer';
import {
  pushLoanJourneyApiError,
  pushLoanJourneyUnknownError,
} from '@/src/services/logging/logPoolJourney';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import { ZapcashLoading } from '../ZapcashLoading';
import { SuccessModal } from '../SuccessModal';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';


const GENERIC_ERROR = 'Unable to start DigiLocker. Please try again.';

/**
 * DigiLocker step — collect Aadhaar number and initiate KYC.
 */
export function DigilockerStep({ onNext, onPrev }: StepProps) {
  const { isSimulating, simulatedState } = useStepSimulation();
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isInitiated, setIsInitiated] = useState(false);
  const [isWebViewOpen, setIsWebViewOpen] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const isStatusQueryEnabled = useInteractionReady();
  const { isLoading: isStatusLoading, data: digilockerStatusData, refetch: refetchDigilockerStatus } =
    useDigilockerStatus(isStatusQueryEnabled);
  const [isAadhaarLinkedVerified, setIsAadhaarLinkedVerified] = useState<boolean | null>(null);
  const successAutoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: initiateDigilocker,
    onSuccess: (response) => {
      if (response.success && response.data?.url) {
        setDigilockerUrl(response.data.url);
        setIsInitiated(true);
        setIsWebViewOpen(true);
        return;
      }
      if (!response.success) {
        pushLoanJourneyApiError('digilocker initiate', response.error, response.status);
      } else {
        pushLoanJourneyUnknownError('digilocker initiate', new Error(GENERIC_ERROR));
      }
      const message = response.success
        ? GENERIC_ERROR
        : getApiErrorDisplayMessage(response.error) || GENERIC_ERROR;
      console.log('message', message);
      setErrorMessage(message);
    },
    onError: (error) => {
      pushLoanJourneyUnknownError('digilocker initiate', error);
      setErrorMessage(errorHandler(error) || GENERIC_ERROR);
    },
  });

  useEffect(() => {
    if (!isStatusQueryEnabled) return;

    if (!digilockerStatusData) {
      if (!isStatusLoading) {
        setIsAadhaarLinkedVerified(false);
        // setErrorMessage(GENERIC_ERROR);
      }
      return;
    }

    if (!digilockerStatusData.success) {
      const message = digilockerStatusData.error?.message ?? '';
      // Backend can respond with "Verification ID is required" when no KYC is initiated yet.
      // In that case, keep the user on the initiate flow without showing an error.
      if (/verification id is required/i.test(message)) {
        setIsAadhaarLinkedVerified(false);
        // setErrorMessage('');
        return;
      }
      pushLoanJourneyApiError('digilocker status', digilockerStatusData.error, digilockerStatusData.status);
      setIsAadhaarLinkedVerified(false);
      // setErrorMessage(getApiErrorDisplayMessage(digilockerStatusData.error) || GENERIC_ERROR);
      return;
    }

    const isVerified = Boolean(digilockerStatusData.data?.isAadhaarLinkedNumberVerified);
    setIsAadhaarLinkedVerified(isVerified);
  }, [digilockerStatusData, isStatusLoading, isStatusQueryEnabled]);


  const onSubmit = () => {
    setErrorMessage('');
    void logAnalyticsEvent(ANALYTICS_EVENT.DIGILOCKER_INITIAL_CLICK);
    mutate({});
  };

  const refreshDigilockerStatus = useCallback(async (): Promise<void> => {
    if (!isStatusQueryEnabled) return;
    setIsRefreshingStatus(true);
    try {
      await refetchDigilockerStatus();
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [isStatusQueryEnabled, refetchDigilockerStatus]);

  const handleOpenDigilocker = async (): Promise<void> => {
    if (!digilockerUrl) {
      setErrorMessage('Unable to open DigiLocker link. Please try again.');
      return;
    }
    setIsWebViewOpen(true);
  };

  const handleCloseWebView = useCallback(() => {
    setIsWebViewOpen(false);
    if (isInitiated) {
      void refreshDigilockerStatus();
    }
  }, [isInitiated, refreshDigilockerStatus]);

  const handleDigilockerSuccess = useCallback(
    (_payload: DigilockerSuccessPayload) => {
      setErrorMessage('');
      setIsWebViewOpen(false);
      void refreshDigilockerStatus();
    },
    [refreshDigilockerStatus]
  );

  const handleSuccessConfirm = useCallback(() => {
    if (successAutoNextTimerRef.current) {
      clearTimeout(successAutoNextTimerRef.current);
      successAutoNextTimerRef.current = null;
    }
    onNext();
  }, [onNext]);

  const handleSuccessClose = useCallback(() => {
    if (successAutoNextTimerRef.current) {
      clearTimeout(successAutoNextTimerRef.current);
      successAutoNextTimerRef.current = null;
    }
    onNext();
  }, [onNext]);

  useEffect(() => {
    if (!isAadhaarLinkedVerified) return;
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
  }, [isAadhaarLinkedVerified, onNext]);

  // Dev simulation: auto-advance on success (mirrors actual flow)
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

  // Dev simulation: show loading, success, or error UI without API
  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.loadingContainer}>
            <ZapcashLoading
              visible={true}
              title="Fetching your kyc"
              message="We're fetching your kyc status. This may take a few seconds."
              source="DigilockerStep"
            />
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'success') {
      return (
        <>
          <SuccessModal
            showContactSupport
            visible={true}
            title="Completing Your Verification"
            message="We're securely confirming your Aadhaar details"
            imageSource={IMAGES.DIGILOCKER_SUCCESS}
            renderAsOverlay
          />
        </>
      );
    }
    if (simulatedState === 'error') {
      return (
        <FormLayout
          showContactSupport
          safeAreaEdges={['bottom']}
          onBack={onPrev}
          footer={
            <Button variant="primary" size="large" fullWidth onPress={onSubmit}>
              Initiate KYC
            </Button>
          }
        >
          <View style={styles.content}>
            <ErrorContainer responseError={GENERIC_ERROR} />
            <View style={styles.imageWrapper}>
              <Image source={IMAGES.DIGILOCKER} resizeMode="contain" style={styles.digilockerImage} />
            </View>
          </View>
        </FormLayout>
      );
    }
  }

  if (isRefreshingStatus) {
    return (
      <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
        <View style={styles.loadingContainer}>
          <ZapcashLoading
            visible={true}
            title="Fetching your kyc"
            message="We're fetching your kyc status. This may take a few seconds."
            source="DigilockerStep"
          />
        </View>
      </FormLayout>
    );
  }

  if (isAadhaarLinkedVerified) {
    return (
      <>
        <SuccessModal
          showContactSupport
          visible={isAadhaarLinkedVerified}
          title="Completing Your Verification"
          message="We're securely confirming your Aadhaar details"
          imageSource={IMAGES.DIGILOCKER}
          renderAsOverlay
        />
      </>
    );
  }

  const footerButton = isInitiated ? (
    <Button variant="primary" size="large" fullWidth onPress={handleOpenDigilocker}>
      Proceed to KYC
    </Button>
  ) : (
    <Button
      variant="primary"
      size="large"
      fullWidth
      loading={isPending}
      disabled={isPending}
      onPress={onSubmit}
    >
      Proceed to KYC
    </Button>
  );

  return (
    <FormLayout
      showContactSupport
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={(
        <View style={styles.footerContent}>
          {/* <ConsentNotice
            text={CONSENT_MESSAGE.DIGILOCKER}
          /> */}

          {/* Add a Powered by DigiLocker text */}
          {/* <AppText style={styles.poweredByText} variant="body" weight="medium">
            Powered by DigiLocker
          </AppText> */}

          {footerButton}
        </View>
      )}
    >
      <View style={styles.content}>
        <ErrorContainer responseError={errorMessage} />
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Complete Aadhaar Verification
        </AppText>
        <AppText style={styles.subtitle} variant="caption" color="tertiary">
          To proceed, please verify your identity using DigiLocker. This is a secure and government-approved process
        </AppText>

        {/* <View style={styles.formSection}>
          <AadhaarBoxesInput
            control={control}
            name="aadhaarNumber"
            label="Aadhaar Number"
            editable={!isInitiated}
            autoFocus={!isInitiated}
            required
          />
          <ErrorContainer responseError={errorMessage} />
        </View> */}

        <View style={styles.imageWrapper}>
          <Image source={IMAGES.DIGILOCKER} resizeMode="contain" style={styles.digilockerImage} />
        </View>
      </View>
      <FullScreenModal
        footer={<ContactSupport />}
        visible={isWebViewOpen}
        onClose={handleCloseWebView}
        title="Digi Locker"
        subtitle="Complete your Aadhaar verification"
        showTopGradient
      >
        <View style={styles.webViewContainer}>
          <Digilocker
            url={digilockerUrl}
            style={styles.webView}
            onDigilockerSuccess={handleDigilockerSuccess}
          />
        </View>
      </FullScreenModal>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  stepWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: spacing.base,
  },
  imageWrapper: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digilockerImage: {
    width: '100%',
    height: 120,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    // color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  footerContent: {
    rowGap: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    color: colors.text.secondary,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successBadge: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    color: colors.success.main,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cardIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  cardTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cardDescription: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    marginHorizontal: -spacing.base,
  },
  poweredByText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});

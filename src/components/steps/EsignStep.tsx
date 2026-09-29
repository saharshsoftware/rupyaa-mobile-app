import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, ImageStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { FullScreenModal } from '../FullScreenModal';
import { StandardWebView } from '../StandardWebView';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing, radius } from '@/src/theme';
import { IMAGES } from '@/src/constants/images';
import {
  generateAgreementAutomatic,
  importGoogleContacts,
  initiateSanctionDoqfy,
  getEsignStatus,
} from '@/src/services/registration/sanctionApi';
import {
  pushLoanJourneyApiError,
  pushLoanJourneyUnknownError,
} from '@/src/services/logging/logPoolJourney';
import { loanService } from '@/src/services/loans/loanService';
import type { GetExistingActiveLoanResponse } from '@/src/types/loans';
import { getGeoLocationForEsignOrMandate } from '@/src/services/location/geoLocation';
import { ZapcashLoading } from '../ZapcashLoading';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { commonStyles } from '@/src/utils/common-styles';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import { usePersonalDetails } from '@/src/hooks/usePersonalDetails';

const ESIGN_STATUS_COMPLETED = 'Completed';
const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 2;
const CTA_LABEL = 'Proceed to E Sign';

/** Returns true if the loan has a non-empty sanctionedPdfKey (agreement already generated). */
function hasValidSanctionedPdfKey(loan: GetExistingActiveLoanResponse['loan']): boolean {
  const key = loan?.sanctionedPdfKey;
  return typeof key === 'string' && key.trim().length > 0;
}

const VERIFICATION_POINTS = [
  'Quick and Secured Google verification',
  'Complete e-sign immediately after verification',
] as const;

type EsignScreen = 'ready' | 'polling' | 'pending' | 'success' | 'failed';

interface EsignFailureScreenProps {
  onRetry: () => void;
}

function EsignFailureScreen({ onRetry }: EsignFailureScreenProps) {
  return (
    <View style={styles.failureScreen}>
      <AppText style={styles.failureTitle} variant="h3" weight="semiBold">
        E-sign Not Completed
      </AppText>
      <AppText style={styles.failureSubtitle} variant="body">
        Please complete the e-sign from your email.
      </AppText>
      <Button variant="primary" size="medium" fullWidth onPress={onRetry}>
        Try again
      </Button>
    </View>
  );
}

export function EsignStep({ onNext, onPrev }: StepProps) {
  const { isSimulating, simulatedState } = useStepSimulation();
  const { promptAsync: signInWithGoogle } = useGoogleAuth();
  const [screen, setScreen] = useState<EsignScreen>('ready');
  const [failureMessage, setFailureMessage] = useState<string>('');
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [isWebViewModalOpen, setIsWebViewModalOpen] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isGoogleVerifying, setIsGoogleVerifying] = useState(false);
  const [agreementGenerationFailed, setAgreementGenerationFailed] = useState(false);
  const [isOauthDone, setIsOauthDone] = useState(false);
  const isMountedRef = useRef(true);

  const { personalDetails } = usePersonalDetails();

  useEffect(() => {
    setIsOauthDone(personalDetails?.isOauthDone === true);
    console.log('[EsignStep] useEffect: setIsOauthDone', isOauthDone);
  }, [personalDetails]);
  /**
   * On mount, check if esign is already completed (e.g. user signed via email and returned).
   * If not completed: fetch existing active loan; only call generateAgreementAutomatic when
   * loan has no valid sanctionedPdfKey. On agreement API error, disable main CTA.
   */
  const initializeEsignScreen = useCallback(async (): Promise<void> => {
    const statusResponse = await getEsignStatus();
    if (!isMountedRef.current) return;

    if (statusResponse.success && statusResponse.data?.status === ESIGN_STATUS_COMPLETED) {
      setScreen('success');
      return;
    }

    const loanResponse = await loanService.getExistingActiveLoan();
    if (!isMountedRef.current) return;

    const loanData =
      loanResponse.success && loanResponse.data != null
        ? (loanResponse.data as GetExistingActiveLoanResponse)
        : null;
    if (hasValidSanctionedPdfKey(loanData?.loan ?? null)) {
      return;
    }

    const agreementResponse = await generateAgreementAutomatic();
    if (!isMountedRef.current) return;

    if (!agreementResponse.success) {
      pushLoanJourneyApiError(
        'esign generate agreement',
        agreementResponse.error,
        agreementResponse.status
      );
      setAgreementGenerationFailed(true);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void initializeEsignScreen();
    return () => {
      isMountedRef.current = false;
    };
  }, [initializeEsignScreen]);

  const startPolling = useCallback(() => {
    let attempts = 0;

    const poll = async () => {
      if (!isMountedRef.current) return;

      const response = await getEsignStatus();
      if (!isMountedRef.current) return;

      if (response.success && response.data?.status === ESIGN_STATUS_COMPLETED) {
        setScreen('success');
        return;
      }

      attempts += 1;
      if (attempts >= POLL_MAX_ATTEMPTS) {
        setScreen('pending');
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INTERVAL_MS);
  }, []);

  const handleProceedToEsign = useCallback(async (): Promise<void> => {
    if (isInitiating) return;

    setIsInitiating(true);
    setFailureMessage('');

    const geoLocationEsign = await getGeoLocationForEsignOrMandate();
    const response = await initiateSanctionDoqfy(geoLocationEsign);

    if (!isMountedRef.current) return;

    setIsInitiating(false);

    if (response.success && response.data?.invitationLink) {
      void logAnalyticsEvent(ANALYTICS_EVENT.ESIGN_INITIATED_CLICK);
      setInvitationLink(response.data.invitationLink);
      setIsWebViewModalOpen(true);
      return;
    }

    if (!response.success) {
      pushLoanJourneyApiError('esign initiate', response.error, response.status);
    } else {
      pushLoanJourneyUnknownError('esign initiate', new Error('Could not start e-sign.'));
    }
    setFailureMessage(
      response.success
        ? 'Could not start e-sign.'
        : response.error?.message ?? 'Something went wrong. Please try again.'
    );
    setScreen('failed');
  }, [isInitiating]);

  const handleVerifyGoogleAndProceed = useCallback(async (): Promise<void> => {
    console.log('[EsignStep] handleVerifyGoogleAndProceed: isGoogleVerifying', isGoogleVerifying);
    console.log('[EsignStep] handleVerifyGoogleAndProceed: isInitiating', isInitiating);
    if (isGoogleVerifying || isInitiating) return;

  
    setIsGoogleVerifying(true);
    setFailureMessage('');

    try {
      const result = await signInWithGoogle();
      debugger;
      console.log('[EsignStep] handleVerifyGoogleAndProceed: result', result);
      if (!isMountedRef.current) return;

      if (result?.type === 'cancelled') {
        setIsGoogleVerifying(false);
        return;
      }
      if (result?.type === 'error') {
        const errorMessage =
          result.error instanceof Error && result.error.message.trim().length > 0
            ? result.error.message
            : 'Google verification was not completed. Please try again.';
        pushLoanJourneyUnknownError('esign google auth', result.error ?? errorMessage);
        setFailureMessage(errorMessage);
        setScreen('failed');
        return;
      }

      const accessToken = result?.accessToken;
      if (!accessToken) {
        console.log('[EsignStep] handleVerifyGoogleAndProceed: !accessToken');
        pushLoanJourneyUnknownError(
          'esign google auth',
          new Error('Google verification was not completed. Please try again.')
        );
        setFailureMessage('Google verification was not completed. Please try again.');
        console.log('[EsignStep] handleVerifyGoogleAndProceed: setFailureMessage', setFailureMessage);
        // setFailureMessage(
        //   `${JSON.stringify({resultError: result.error})}`
        // );
        setScreen('failed');
        return;
      }

      const importResponse = await importGoogleContacts(accessToken);
      if (!isMountedRef.current) return;
      console.log('[EsignStep] handleVerifyGoogleAndProceed: importResponse', importResponse);

      const importSuccessful = importResponse.success;

      if (!importSuccessful) {
        pushLoanJourneyApiError(
          'esign google contacts import',
          importResponse.error,
          importResponse.status
        );
        setScreen('failed');
        return;
      }

      await handleProceedToEsign();
    } catch (err) {
      if (isMountedRef.current) {
        pushLoanJourneyUnknownError('esign google auth', err);
        setFailureMessage('Google verification was not completed. Please try again.');
        // setFailureMessage(
        //   `${JSON.stringify({err})}`
        // );
        setScreen('failed');
      }
    } finally {
      if (isMountedRef.current) {
        setIsGoogleVerifying(false);
      }
    }
  }, [isGoogleVerifying, isInitiating, signInWithGoogle, handleProceedToEsign]);

  const closeWebViewModal = useCallback(() => {
    setIsWebViewModalOpen(false);
    if (invitationLink != null) {
      setScreen('polling');
      startPolling();
    }
  }, [invitationLink, startPolling]);

  // Called when the webview posts an ESIGN_SUCCESS message — skip polling and go straight to success.
  const handleEsignSuccess = useCallback(() => {
    setIsWebViewModalOpen(false);
    setScreen('success');
  }, []);

  const handleRetryFromPending = useCallback(() => {
    if (invitationLink != null) {
      setIsWebViewModalOpen(true);
    }
  }, [invitationLink]);

  const handleRetryFromFailed = useCallback(() => {
    setFailureMessage('');
    setScreen('ready');
  }, []);

  const handleCloseFailed = handleRetryFromFailed;

  useEffect(() => {
    if (screen === 'success') {
      onNext();
    }
  }, [screen, onNext]);

  // Success screen is intentionally disabled; successful E-Sign now advances directly.
  // const handleContinueFromSuccess = useCallback(() => {
  //   onNext();
  // }, [onNext]);

  const handleCtaPress = useCallback(() => {
    console.log('[EsignStep] handleCtaPress: isOauthDone', isOauthDone);
    if (isOauthDone) {
      console.log('[EsignStep] handleCtaPress: isOauthDone');
      void handleProceedToEsign();
    } else {
      console.log('[EsignStep] handleCtaPress: !isOauthDone');
      void handleVerifyGoogleAndProceed();
    }
  }, [isOauthDone, handleProceedToEsign, handleVerifyGoogleAndProceed]);

  // Dev simulation: show loading, success, or error UI without API
  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <FormLayout
          safeAreaEdges={['bottom']}
          onBack={onPrev}
          footer={<></>}
        >
          <View style={styles.generatingWrapper}>
            <ZapcashLoading
              visible
              title=""
              message="Please wait..."
              source="EsignStep"
            />
          </View>
        </FormLayout>
      );
    }

    // E-Sign success screen is not used in the active journey.
    // if (simulatedState === 'success') {
    //   return (
    //     <FullScreenModal visible onClose={handleContinueFromSuccess}>
    //       <StepResultScreen
    //         image={IMAGES.ESIGN_SUCCESS}
    //         title="E-Sign completed Successfully!"
    //         subtitle="Your agreement has been signed and verified"
    //         primaryAction={{ label: 'Proceed', onPress: handleContinueFromSuccess }}
    //       />
    //     </FullScreenModal>
    //   );
    // }

    if (simulatedState === 'error') {
      return (
        <FullScreenModal visible onClose={() => { }} showTopGradient>
          <EsignFailureScreen onRetry={() => { }} />
        </FullScreenModal>
      );
    }
  }

  if (screen === 'ready') {
    const isProcessing = isGoogleVerifying || isInitiating;
    const isCtaDisabled = isProcessing || agreementGenerationFailed;

    return (
      <FormLayout
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        footer={
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleCtaPress}
            loading={isProcessing}
            disabled={isCtaDisabled}
          >
            {CTA_LABEL}
          </Button>
        }
      >
        <View style={styles.readyWrapper}>
          <View style={styles.verificationCard}>
            <View style={styles.verificationIconWrap}>
              <SvgUri
                uri={Image.resolveAssetSource(IMAGES.ESIGN_VERIFICATION).uri}
                width={styles.verificationImage.width}
                height={styles.verificationImage.height}
              />
            </View>

            <AppText style={styles.verificationTitle} variant="caption" weight="semiBold">
              Email Verification Before E-Sign
            </AppText>
            <AppText style={styles.verificationSubtitle} variant="captionSmall">
              To continue, help us verify your Google account to receive your signed agreement.
            </AppText>

            <View style={styles.pointsList}>
              {VERIFICATION_POINTS.map((point) => (
                <View style={styles.pointRow} key={point}>
                  <View style={styles.pointDot} />
                  <AppText style={styles.pointText} variant="caption">
                    {point}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <FullScreenModal
          visible={isWebViewModalOpen}
          onClose={closeWebViewModal}
          title="E-Sign"
          subtitle="Please sign your loan agreement"
          disableContentPadding
        >
          {invitationLink != null && (
            <StandardWebView
              source={{ uri: invitationLink }}
              loadingEnabled
              onEsignSuccess={handleEsignSuccess}
              onLoadEnd={() => {
                console.log('[EsignStep] Load End');
                // debugger;
              }}
            />
          )}
        </FullScreenModal>
      </FormLayout>
    );
  }

  if (screen === 'polling') {
    return (
      <FormLayout
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        footer={<></>}
      >
        <View style={styles.pollingWrapper}>
          <ZapcashLoading
            visible
            title="Verifying your signature…"
            message="We are still verifying your signature. If you already completed e-sign, please wait a little longer. Otherwise, you can retry now."
            source="EsignStep"
          />
        </View>
      </FormLayout>
    );
  }

  if (screen === 'pending') {
    return (
      <FormLayout
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        footer={
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handleRetryFromPending}
          >
            Retry E-Sign
          </Button>
        }
      >
        <View style={styles.pendingWrapper}>
          <Image source={IMAGES.NO_OFFER_AVAILABLE} style={commonStyles.image as ImageStyle} />
          <AppText style={styles.pendingText} variant="body">
            We are still verifying your signature. If you already completed e-sign, please wait a
            little longer. Otherwise, you can retry now.
          </AppText>
        </View>

        <FullScreenModal
          visible={isWebViewModalOpen}
          onClose={closeWebViewModal}
          title="E-Sign"
          subtitle="Please sign your loan agreement"
          disableContentPadding
        >
          {invitationLink != null && (
            <StandardWebView
              source={{ uri: invitationLink }}
              loadingEnabled
              onEsignSuccess={handleEsignSuccess}
            />
          )}
        </FullScreenModal>
      </FormLayout>
    );
  }

  // E-Sign success screen is not used in the active journey.
  // if (screen === 'success') {
  //   return (
  //     <FullScreenModal visible onClose={handleContinueFromSuccess}>
  //       <StepResultScreen
  //         image={IMAGES.ESIGN_SUCCESS}
  //         title="E-Sign completed Successfully!"
  //         subtitle="Your agreement has been signed and verified"
  //         primaryAction={{ label: 'Proceed', onPress: handleContinueFromSuccess }}
  //       />
  //     </FullScreenModal>
  //   );
  // }

  if (screen === 'failed') {
    return (
      <FullScreenModal visible onClose={handleCloseFailed} showTopGradient>
        <EsignFailureScreen onRetry={handleRetryFromFailed} />
      </FullScreenModal>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  generatingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  readyWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing['5xl'],
  },
  verificationCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    alignItems: 'center',
  },
  verificationIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  verificationImage: {
    width: 160,
    height: 160,
  },
  verificationTitle: {
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 18,
  },
  verificationSubtitle: {
    color: colors.text.secondary,
    maxWidth: 300,
    lineHeight: 16,
    marginBottom: spacing.xl,
    textAlign: 'center',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  pointsList: {
    width: '100%',
    maxWidth: 300,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pointDot: {
    width: 3,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.text.secondary,
  },
  pointText: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  pollingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pollingText: {
    color: colors.text.secondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  pendingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pendingText: {
    color: colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  failureScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['6xl'],
  },
  failureTitle: {
    color: colors.error.main,
    fontSize: 20,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  failureSubtitle: {
    color: colors.text.gray,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
});

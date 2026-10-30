import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RelativePathString, useRouter } from 'expo-router';
import { AuthHeader } from './AuthHeader';
import { SelectedOfferCard } from './SelectedOfferCard';
import { ProgressStepper, ProgressStepperV2 } from './ProgressStepper';
import { IneligibilityModal } from './IneligibilityModal';
import { OfferStatusModal } from './OfferStatusModal';
import { UnderReviewModal } from './UnderReviewModal';
import { PreEnachReviewGateModal } from './PreEnachReviewGateModal';
import { DevStepToolbar } from './DevStepToolbar';
import { LocationPermissionModal } from './LocationPermissionModal';
import { navigateToPhaseSubstep } from '@/src/services/navigation/stepNavigation';
import { useFlowStore } from '@/src/store/useFlowStore';
import { FLOW_CONFIG, FLOW_PHASES, getMainStepLabels, getPhaseProgressPercent, getSubstepCount } from '@/src/config/flowSteps';
import { STEP_COMPONENTS } from './steps';
import { devLog } from '@/src/utils';
import { isCblOrRejectedStage, UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { fetchUserStage } from '@/src/services/user/useUserStage';
import { appConfig } from '@/src/config/appConfig';
import { goHomeWithFallback, HOME_ROUTE } from '@/src/services/navigation/homeNavigation';
import { shouldSkipUserStageSync } from '@/src/services/navigation/stepNavigation';
import { colors, spacing } from '@/src/theme';
import { AppText } from './AppText';
import { useLoanJourneyPermissionGate } from '@/src/hooks/useLoanJourneyPermissionGate';
import { consoleLogDev } from '@/src/utils/common-helper';
import { logAnalyticsEvent } from '@/src/services/analytics';
import { LOAN_JOURNEY_LAND_EVENT_BY_SUBSTEP } from '@/src/services/analytics/loanJourneyLandEvents';
import {
  logJourneyOfferCheckOffers,
  logJourneySubstepEntered,
} from '@/src/services/logging/logPoolJourney';
import { usePreEnachReviewGate } from '@/src/hooks/usePreEnachReviewGate';
import { useOfferStatusStagePrefetch } from '@/src/hooks/useOfferStatusStagePrefetch';

// Get steps once (static)
const STEPPER_STEPS = getMainStepLabels();
const LOG = "LoanWizard";

function getStageBasedRoute(params: {
  userStage?: UserStage;
  applicationCompleted: boolean;
}): string | null {
  const { userStage, applicationCompleted } = params;
  consoleLogDev('getStageBasedRoute', { userStage, applicationCompleted });
  if (isCblOrRejectedStage(userStage)) {
    return '/(tabs)/home';
  }
  // Backend stage is authoritative. If we have a non-home stage, ignore stale local completion flag.
  if (userStage) return null;
  if (applicationCompleted) return '/(tabs)/home';
  return null;
}

export function LoanWizard() {
  const router = useRouter();
  const phaseIndex = useFlowStore((s) => s.phaseIndex);
  const substepIndex = useFlowStore((s) => s.substepIndex);
  const passedSubsteps = useFlowStore((s) => s.passedSubsteps);
  const passedPhases = useFlowStore((s) => s.passedPhases);
  const userStage = useFlowStore((s) => s.userStage);
  const applicationCompleted = useFlowStore((s) => s.applicationCompleted);
  const journeyStoppedReason = useFlowStore((s) => s.journeyStoppedReason);
  const setJourneyStoppedReason = useFlowStore((s) => s.setJourneyStoppedReason);
  const ineligibilityMessage = useFlowStore((s) => s.ineligibilityMessage);
  const clearIneligibility = useFlowStore((s) => s.clearIneligibility);
  const showOfferStatusModal = useFlowStore((s) => s.showOfferStatusModal);
  const setShowOfferStatusModal = useFlowStore((s) => s.setShowOfferStatusModal);
  const goTo = useFlowStore((s) => s.goTo);
  const stageSyncStatus = useFlowStore((s) => s.stageSyncStatus);
  const transitionDirection = useFlowStore((s) => s.transitionDirection);
  const next = useFlowStore((s) => s.next);
  const prev = useFlowStore((s) => s.prev);

  const safePhaseIndex = Math.max(0, Math.min(phaseIndex, FLOW_PHASES.length - 1));
  const currentPhase = FLOW_PHASES[safePhaseIndex];
  const phaseConfig = FLOW_CONFIG[currentPhase];
  const totalSubsteps = getSubstepCount(currentPhase);
  // Clamp substep index to avoid out-of-range access after state restore or race conditions.
  const safeSubstepIndex = Math.max(0, Math.min(substepIndex, Math.max(totalSubsteps - 1, 0)));
  const currentSubstep = phaseConfig.substeps[safeSubstepIndex];
  const currentSubstepId = currentSubstep?.id;
  const StepComponent = STEP_COMPONENTS?.[currentSubstep?.component] || null;
  const preEnachReviewGate = usePreEnachReviewGate(currentSubstepId);
  const {
    isGranted: areLoanJourneyPermissionsGranted,
    hasCheckedInitialPermissions,
    canAskAgain,
    isChecking,
    requestPermission,
    openSettings,
  } = useLoanJourneyPermissionGate(currentSubstepId);


  // Real-time progress (0–1) within current phase from current substep position.
  // Keeps step/substep progress in sync with flow so the stepper reflects current screen.
  const progress =
    currentSubstepId != null
      ? getPhaseProgressPercent(currentPhase, currentSubstepId) / 100
      : 0;

  const { isResolvingStage: isResolvingOfferStatusStage, awaitResolvedStage } =
    useOfferStatusStagePrefetch(showOfferStatusModal);

  // Log flow state changes including pass flags, user stage, and component name
  useEffect(() => {
    devLog.flowState({
      phaseIndex,
      substepIndex,
      phase: currentPhase,
      substepId: currentSubstep?.id,
      passedSubsteps,
      passedPhases,
      userStage: userStage,
      componentName: currentSubstep?.component,
    });
  }, [phaseIndex, substepIndex, currentPhase, currentSubstep?.id, currentSubstep?.component, passedSubsteps, passedPhases, userStage]);

  // Loan journey "land" analytics: once per navigation to a substep (dedupes React Strict Mode double effects).
  const lastLoggedLandPositionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const substepId = currentSubstep?.id;
    if (!substepId) return;
    const landEvent = LOAN_JOURNEY_LAND_EVENT_BY_SUBSTEP[substepId];
    if (!landEvent) return;

    const positionKey = `${safePhaseIndex}-${safeSubstepIndex}-${substepId}`;
    if (lastLoggedLandPositionKeyRef.current === positionKey) {
      return;
    }
    lastLoggedLandPositionKeyRef.current = positionKey;
    void logAnalyticsEvent(landEvent);
    logJourneySubstepEntered(currentPhase, substepId);
  }, [safePhaseIndex, safeSubstepIndex, currentPhase, currentSubstep?.id]);

  // Direction-aware slide animation when step changes
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fromX = transitionDirection === 'forward' ? 50 : -50;
    slideAnim.setValue(fromX);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [currentSubstep?.id, transitionDirection, slideAnim]);

  // Only recompute stepper props when the values that actually affect the
  // stepper change — not on every LoanWizard re-render (e.g. transitionDirection).
  const stepperProps = useMemo(() => ({
    steps: STEPPER_STEPS,
    currentStep: safePhaseIndex,
    progress,
    passedPhases,
    passedSubsteps,
    currentSubstepIndex: safeSubstepIndex,
    totalSubstepsInCurrentPhase: totalSubsteps,
    currentSubstepLabel: currentSubstep?.label,
  }), [safePhaseIndex, progress, passedPhases, passedSubsteps, safeSubstepIndex, totalSubsteps, currentSubstep?.label]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      goHomeWithFallback(router);
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  const handlePreEnachReviewBackToHome = useCallback(() => {
    goHomeWithFallback(router);
  }, [router]);

  const handleGoHome = useCallback(() => {
    setJourneyStoppedReason(null);
    clearIneligibility();

    router.replace('/support?hideCallToAction=true');
    // goHomeWithFallback(router);
  }, [router, setJourneyStoppedReason, clearIneligibility]);

  const handleUnderReviewGoHome = useCallback(() => {
    router.replace(HOME_ROUTE);
  }, [router]);

  /**
   * Called when user taps "Check Offers" in OfferStatusModal. Awaits the get-user-stage prefetch
   * (started when the modal opened) before navigating so the OFFERINGS gate is current.
   * ApprovedOfferStep reads showUpdateButton from /offer/current, not user-stage context.
   */
  const handleOfferStatusCheckOffers = useCallback(async () => {
    logJourneyOfferCheckOffers();
    consoleLogDev('[LoanWizard] OfferStatusModal Check Offers -> awaiting get-user-stage before navigating to ApprovedOfferStep');
    await awaitResolvedStage();
    setShowOfferStatusModal(false);
    navigateToPhaseSubstep({
      goTo,
        phase: 'offer',
        substepId: 'approved-offer',
        source: 'LoanWizard',
      });
  }, [goTo, setShowOfferStatusModal, awaitResolvedStage]);

  const handleOfferStatusBackToHome = useCallback(() => {
    setShowOfferStatusModal(false);
    router.replace(HOME_ROUTE);
  }, [router, setShowOfferStatusModal]);

  const handleNext = useCallback(() => {
    const { phaseIndex: currentPhaseIndex, substepIndex: currentSubstepIdx } = useFlowStore.getState();
    const currentPhaseName = FLOW_PHASES[currentPhaseIndex];
    const currentSubstepId = FLOW_CONFIG[currentPhaseName].substeps[currentSubstepIdx]?.id;

    next();

    if (!shouldSkipUserStageSync(currentPhaseName, currentSubstepId)) {
      void fetchUserStage();
    }
  }, [next]);

  useEffect(() => {
    const stageRoute = getStageBasedRoute({ userStage, applicationCompleted });
    if (stageRoute) {
      if (stageRoute === HOME_ROUTE) {
        goHomeWithFallback(router);
        return;
      }
      router.replace(stageRoute as RelativePathString);
    }
  }, [userStage, applicationCompleted, router]);

  // When the backend stage is APPLICATION_STATUS the under-review overlay is shown.
  // Fetch the latest stage once so that if the backend has already advanced the user
  // (e.g. to ENACH), syncFromUserStage updates the store and the redirect effect above
  // fires automatically — no manual refresh needed from the user.
  // Keyed on userStage so this fires exactly once each time we enter APPLICATION_STATUS.
  useEffect(() => {
    if (userStage !== UserStagesInBackend.APPLICATION_STATUS) return;
    void fetchUserStage();
  }, [userStage]);

  consoleLogDev('journeyStoppedReason', journeyStoppedReason);

  const hasSyncError = stageSyncStatus === 'error';
  const isUnderReview = userStage === UserStagesInBackend.APPLICATION_STATUS;
  const showSelectedOffer = currentPhase === 'kyc' || currentPhase === 'disbursal';
  if (!StepComponent) {
    return null;
  }

  return (
    <View style={styles.root}>
      {/* Static header — lives OUTSIDE the slide animation so it never
          re-mounts or jumps when the active step changes. The top safe-area
          inset is consumed here; step FormLayouts use safeAreaEdges={["bottom"]}. */}
      <SafeAreaView edges={['top']} style={styles.wizardHeader}>
        <View style={styles.wizardHeaderContent}>
          <AuthHeader />
          {!isUnderReview && (
            appConfig.useProgressStepperV2 ? (
              <ProgressStepperV2
                {...stepperProps}
                accentColor={colors.primary.main}
              />
            ) : (
              <ProgressStepper {...stepperProps} />
            )
          )}
          {showSelectedOffer && <SelectedOfferCard />}
        </View>
      </SafeAreaView>

      {hasSyncError && (
        <Pressable
          style={styles.syncErrorBanner}
          onPress={() => void fetchUserStage()}
          accessibilityRole="button"
          accessibilityLabel="Retry syncing progress"
        >
          <AppText style={styles.syncErrorText}>Couldn&apos;t sync progress. Tap to retry.</AppText>
        </Pressable>
      )}

      {/* Only the step content slides on transition — the header above stays fixed. */}
      <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
        <StepComponent onNext={handleNext} onPrev={prev} />
      </Animated.View>

      {/* Rendered outside the step Animated.View so it is not subject to the
          step-change slide animation, and sits at the screen level. When
          navigation occurs the entire screen (including this overlay) transitions
          away as one unit — preventing any flash of the underlying form. */}
      <IneligibilityModal
        visible={ineligibilityMessage !== null}
        message={ineligibilityMessage ?? ''}
        onCtaPress={handleGoHome}
      />
      <OfferStatusModal
        visible={showOfferStatusModal}
        onCheckOffers={handleOfferStatusCheckOffers}
        onBackToHome={handleOfferStatusBackToHome}
        isCheckingOffers={isResolvingOfferStatusStage}
      />
      {/* Shown when backend stage is APPLICATION_STATUS (application submitted, pending review).
          The shared header remains visible while its progress stepper is hidden above. */}
      <UnderReviewModal
        visible={isUnderReview}
        onCtaPress={handleUnderReviewGoHome}
      />
      <PreEnachReviewGateModal
        visible={preEnachReviewGate.visible}
        isLoading={preEnachReviewGate.isLoading}
        hasError={preEnachReviewGate.hasError}
        substepId={currentSubstepId}
        onRetry={preEnachReviewGate.refetch}
        onBackToHome={handlePreEnachReviewBackToHome}
      />
      <LocationPermissionModal
        visible={hasCheckedInitialPermissions && !areLoanJourneyPermissionsGranted}
        canAskAgain={canAskAgain}
        isProcessing={isChecking}
        onRequestPermission={requestPermission}
        onOpenSettings={openSettings}
      />
      {/* {__DEV__ && <DevStepToolbar />} */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  wizardHeader: {
    backgroundColor: colors.transparent,
  },
  wizardHeaderContent: {
    paddingHorizontal: spacing.xl,
  },
  syncErrorBanner: {
    backgroundColor: colors.error.main,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  syncErrorText: {
    color: '#fff',
    fontSize: 14,
  },
  stepContainer: {
    flex: 1
  },
});

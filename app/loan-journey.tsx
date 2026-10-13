import React, { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LoanWizard } from '@/src/components';
import { useFlowStore } from '@/src/store';
import { FLOW_PHASES, findFlowPositionBySubstepId } from '@/src/config/flowSteps';
import { isCblOrRejectedStage, UserStagesInBackend } from '@/src/config/userStages';
import { goHomeWithFallback } from '@/src/services/navigation/homeNavigation';
import { logJourneyEntered } from '@/src/services/logging/logPoolJourney';
import { enforceSensitiveEntrySecurity } from '@/src/services/security';
import { fetchUserStage } from '@/src/services/user/useUserStage';
import {
  navigateToPhaseSubstep,
  navigateToSubstepId,
} from '@/src/services/navigation/stepNavigation';
// import { useSecureScreen } from '@/src/hooks/useSecureScreen';

export default function LoanJourneyScreen() {
  // Prevent screenshots/recordings — this screen shows sensitive PII and financial data.
  // useSecureScreen('loan-journey');
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const hasHandledOfferingsEntryRef = useRef(false);
  const userStage = useFlowStore((s) => s.userStage);
  const phaseIndex = useFlowStore((s) => s.phaseIndex);
  const substepIndex = useFlowStore((s) => s.substepIndex);
  const goTo = useFlowStore((s) => s.goTo);
  const setShowOfferStatusModal = useFlowStore((s) => s.setShowOfferStatusModal);

  const flowId = Array.isArray(params.id) ? params.id[0] : params.id;
  const shouldTreatJourneyAsCompleted = isCblOrRejectedStage(userStage);

  useEffect(() => {
    enforceSensitiveEntrySecurity();
    logJourneyEntered();
    // Always refresh backend stage when entering loan journey.
    void fetchUserStage();
  }, []);

  useEffect(() => {
    if (!flowId || shouldTreatJourneyAsCompleted) return;
    const match = findFlowPositionBySubstepId(flowId);
    if (!match) return;
    const currentPhase = FLOW_PHASES[phaseIndex];
    if (currentPhase === match.phase && substepIndex === match.substepIndex) return;
    navigateToSubstepId({
      goTo,
      substepId: flowId,
      source: 'LoanJourney:query-id',
    });
  }, [flowId, goTo, phaseIndex, shouldTreatJourneyAsCompleted, substepIndex]);

  useEffect(() => {
    if (!shouldTreatJourneyAsCompleted) return;
    goHomeWithFallback(router);
  }, [router, shouldTreatJourneyAsCompleted]);

  useEffect(() => {
    if (hasHandledOfferingsEntryRef.current) return;
    if (flowId || shouldTreatJourneyAsCompleted) return;
    if (userStage !== UserStagesInBackend.OFFERINGS) return;

    hasHandledOfferingsEntryRef.current = true;
    const currentPhase = FLOW_PHASES[phaseIndex];
    const approvedOfferTarget = findFlowPositionBySubstepId('approved-offer');
    const approvedOfferSubstepIndex = approvedOfferTarget?.phase === 'offer'
      ? approvedOfferTarget.substepIndex
      : -1;
    const isAlreadyOnApprovedOfferStep =
      currentPhase === 'offer' && substepIndex === approvedOfferSubstepIndex;

    if (!isAlreadyOnApprovedOfferStep) {
      navigateToPhaseSubstep({
        goTo,
        phase: 'offer',
        substepId: 'approved-offer',
        source: 'LoanJourney:OfferingsEntry',
      });
    }

    // A user returning after application review already has the OFFERINGS stage,
    // so the earlier soft-pull/bank-connect callbacks that normally open this
    // success screen are no longer mounted. Show it explicitly before loan details.
    setShowOfferStatusModal(true, 'Verified');
  }, [
    flowId,
    goTo,
    phaseIndex,
    setShowOfferStatusModal,
    shouldTreatJourneyAsCompleted,
    substepIndex,
    userStage,
  ]);

  if (shouldTreatJourneyAsCompleted) {
    return <View style={styles.container} />;
  }

  return <LoanWizard />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

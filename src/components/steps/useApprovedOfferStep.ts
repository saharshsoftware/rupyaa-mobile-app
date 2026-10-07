import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';
import { fetchCurrentOfferForBankStatement } from '@/src/services/user/useUserStage';
import { offerService } from '@/src/services/offer';
import { useFlowStore } from '@/src/store/useFlowStore';
import { shouldShowImproveOfferABVariant } from '@/src/utils/ab-testing';
import type { CurrentOfferOffer, CurrentOfferSuccessResponse, CurrentEmiOffer } from '@/src/types/offer';
import { getCurrentEmiOffer, isCurrentOfferSuccess, isOfferAcceptable } from '@/src/types/offer';
import type { LoanType } from '@/src/types/loans';
import type { ApiResponse } from '@/src/types/api';
import { navigateToPhaseSubstep } from '@/src/services/navigation/stepNavigation';
import {
  pushLoanJourneyApiError,
  pushLoanJourneyUnknownError,
} from '@/src/services/logging/logPoolJourney';
import { devLog } from '@/src/utils';

const DEFAULT_REFRESH_ERROR = 'Unable to load offer. Please try again.';
const DEFAULT_ACCEPT_ERROR = 'Unable to accept offer. Please try again.';

function getOfferFromStore(
  lastResponse: ReturnType<typeof useCurrentOfferStore.getState>['lastResponse']
): CurrentOfferOffer | null {
  if (!lastResponse?.success || lastResponse.data == null) return null;
  if (!isCurrentOfferSuccess(lastResponse.data)) return null;
  return lastResponse.data.offer;
}

function getLoanTypeFromStore(
  lastResponse: ReturnType<typeof useCurrentOfferStore.getState>['lastResponse']
): LoanType | undefined {
  if (!lastResponse?.success || lastResponse.data == null) return undefined;
  if (!isCurrentOfferSuccess(lastResponse.data)) return undefined;
  return (lastResponse.data as CurrentOfferSuccessResponse).loanType;
}

export interface UseApprovedOfferStepParams {
  /** Called after a successful acceptOffer API response. */
  onAcceptSuccess: () => void;
  /** Called after a failed acceptOffer API response so the caller can dismiss the confirm sheet. */
  onAcceptError: () => void;
}

export interface UseApprovedOfferStepResult {
  offer: CurrentOfferOffer | null;
  emiOffer: CurrentEmiOffer | undefined;
  loanType: LoanType | undefined;
  hasOffer: boolean;
  /** True once we have received an offer response (offer or no-offer); use to hide ZapcashLoading. */
  isOfferResolved: boolean;
  isApproved: boolean;
  showImproveOfferAction: boolean;
  improveOfferByUsingBsa: () => void;
  acceptOffer: () => void;
  isAccepting: boolean;
  acceptError: string | null;
  clearAcceptError: () => void;
  refreshOffer: () => void;
  isRefreshing: boolean;
  refreshError: string | null;
  clearRefreshError: () => void;
}

/**
 * Encapsulates offer derivation from store and accept/refresh mutations.
 * Keeps ApprovedOfferStep UI-focused; extend by adding mutations without changing the step.
 */
export function useApprovedOfferStep({
  onAcceptSuccess,
  onAcceptError,
}: UseApprovedOfferStepParams): UseApprovedOfferStepResult {
  const lastResponse = useCurrentOfferStore((s) => s.lastResponse);
  const showUpdateButton = useCurrentOfferStore((s) => s.showUpdateButton);
  const phoneNumber = useUserDetailsStore((state) => state.personalDetails?.phoneNumber);
  const goTo = useFlowStore((s) => s.goTo);
  const userStage = useFlowStore((s) => s.userStage);
  const setCameFromOfferings = useFlowStore((s) => s.setCameFromOfferings);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isHydratingLatestOffer, setIsHydratingLatestOffer] = useState(true);
  const hasTriggeredInitialOfferFetchRef = useRef(false);

  const offer = getOfferFromStore(lastResponse);
  const emiOffer =
    lastResponse?.success && lastResponse.data != null
      ? getCurrentEmiOffer(lastResponse.data)
      : undefined;
  const loanType = getLoanTypeFromStore(lastResponse);
  const hasOffer = offer != null && isOfferAcceptable(offer);
  const isOfferResolved = lastResponse != null && !isHydratingLatestOffer;
  const isApproved = hasOffer;
  // Controller flow: /offer/current -> useCurrentOfferStore.setLastResponse ->
  // showUpdateButton selector here -> ApprovedOfferStep ActionCard visibility.
  // /stage only gates the OFFERINGS screen; it never owns update eligibility.
  // Even phone numbers see the BSA card; odd or missing numbers stay on the control.
  const showImproveOfferAction =
    isApproved &&
    userStage === 'OFFERINGS' &&
    showUpdateButton &&
    shouldShowImproveOfferABVariant(phoneNumber);

  const acceptMutation = useMutation({
    mutationFn: (): Promise<ApiResponse<unknown>> => offerService.acceptOfferApi(),
    onSuccess: (response) => {
      if (response?.success) {
        onAcceptSuccess();
      } else {
        pushLoanJourneyApiError('accept offer', response?.error, response?.status);
        setAcceptError(DEFAULT_ACCEPT_ERROR);
        onAcceptError();
      }
    },
    onError: (error) => {
      pushLoanJourneyUnknownError('accept offer', error);
      setAcceptError(DEFAULT_ACCEPT_ERROR);
      onAcceptError();
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => fetchCurrentOfferForBankStatement({ force: true }),
    onSuccess: () => {
      setRefreshError(null);
    },
    onError: (error) => {
      pushLoanJourneyUnknownError('refresh offer', error);
      setRefreshError(DEFAULT_REFRESH_ERROR);
    },
  });

  useEffect(() => {
    if (hasTriggeredInitialOfferFetchRef.current) return;

    hasTriggeredInitialOfferFetchRef.current = true;
    if (useCurrentOfferStore.getState().lastResponse != null) {
      setIsHydratingLatestOffer(false);
      return;
    }

    void fetchCurrentOfferForBankStatement()
      .catch((error) => {
        pushLoanJourneyUnknownError('refresh offer', error);
        setRefreshError(DEFAULT_REFRESH_ERROR);
      })
      .finally(() => setIsHydratingLatestOffer(false));
  }, []);

  const clearRefreshError = useCallback(() => setRefreshError(null), []);
  const clearAcceptError = useCallback(() => setAcceptError(null), []);

  const improveOfferByUsingBsa = useCallback(() => {
    setCameFromOfferings(true);
    navigateToPhaseSubstep({
      goTo,
      phase: 'offer',
      substepId: 'bank-connect',
      source: 'useApprovedOfferStep',
    });
  }, [goTo, setCameFromOfferings]);

  const acceptOffer = useCallback(() => {
    if (hasOffer) acceptMutation.mutate();
  }, [hasOffer, acceptMutation]);

  const refreshOffer = useCallback(() => refreshMutation.mutate(), [refreshMutation]);

  return {
    offer,
    emiOffer,
    loanType,
    hasOffer,
    isOfferResolved,
    isApproved,
    showImproveOfferAction,
    improveOfferByUsingBsa,
    acceptOffer,
    isAccepting: acceptMutation.isPending,
    acceptError,
    clearAcceptError,
    refreshOffer,
    isRefreshing: refreshMutation.isPending,
    refreshError,
    clearRefreshError,
  };
}

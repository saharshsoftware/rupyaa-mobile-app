import { useCallback } from 'react';
import { useShouldStopBeforeNach } from '@/src/services/registration/useShouldStopBeforeNach';

export type PreEnachReviewGateUiState = {
  /** Whether the full-screen pre-review gate should show. */
  visible: boolean;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
};

function isEnachOrEsignSubstep(substepId: string | undefined): boolean {
  return substepId === 'enach' || substepId === 'esign';
}

/**
 * On enach/esign when pre-review is enabled, calls GET /mandates/should-stop-before-nach
 * and blocks the step when the API says the user must stop before NACH.
 */
export function usePreEnachReviewGate(currentSubstepId: string | undefined): PreEnachReviewGateUiState {
  const shouldFetch = isEnachOrEsignSubstep(currentSubstepId);
  const stopBeforeNachQuery = useShouldStopBeforeNach({ enabled: shouldFetch });
  const isLoading = shouldFetch && stopBeforeNachQuery.isLoading;
  const hasError = shouldFetch && stopBeforeNachQuery.isError;
  const isBlocked = shouldFetch && stopBeforeNachQuery.data === true;
  const visible = isLoading || hasError || isBlocked;

  const refetch = useCallback((): void => {
    void stopBeforeNachQuery.refetch();
  }, [stopBeforeNachQuery.refetch]);

  return { visible, isLoading, hasError, refetch };
}

import { useCallback } from 'react';
import { logJourneyIneligibilityShown } from '@/src/services/logging/logPoolJourney';
import { useFlowStore } from '@/src/store/useFlowStore';
import type { ApiResponse, ApiError } from '@/src/types/api';

const INELIGIBILITY_FALLBACK_MESSAGE = 'You are not eligible to proceed at this time.';

export interface UseIneligibilityModalResult {
  /**
   * Pass this as `onFailedResponse` to `useRegistrationSubmit`.
   * Returns `true` (error handled → suppress inline error container) when
   * response.error.details?.isEligible === false; `false` for all other errors.
   */
  handleFailedResponse: (response: ApiResponse<unknown>) => boolean;
}

/**
 * Encapsulates the ineligibility check for any registration step.
 *
 * When the API returns `{ isEligible: false }`, this hook writes the message
 * into the flow store. LoanWizard reads from the store and renders the
 * IneligibilityModal as a full-screen overlay at the screen level — keeping
 * it inside the screen's native view hierarchy so it transitions away cleanly
 * with the screen rather than disappearing independently via a native dialog.
 *
 * Usage in any registration step:
 * ```tsx
 * const { handleFailedResponse } = useIneligibilityModal();
 *
 * const { submit, isPending, errorMessage } = useRegistrationSubmit({
 *   mutationFn: ...,
 *   onSuccess: ...,
 *   onFailedResponse: handleFailedResponse,
 * });
 * ```
 */
export function useIneligibilityModal(): UseIneligibilityModalResult {
  const showIneligibility = useFlowStore((s) => s.showIneligibility);

  const handleFailedResponse = useCallback(
    (response: ApiResponse<unknown>): boolean => {
      if (response.success !== false) return false;
      const details = (response as ApiError).error.details as
        | { isEligible?: boolean }
        | undefined;
      if (details?.isEligible !== false) return false;
      const apiMessage = (response as ApiError).error.message?.trim();
      console.log('Ineligibility', { apiMessage });
      logJourneyIneligibilityShown();
      showIneligibility(INELIGIBILITY_FALLBACK_MESSAGE);
      return true;
    },
    [showIneligibility]
  );

  return { handleFailedResponse };
}

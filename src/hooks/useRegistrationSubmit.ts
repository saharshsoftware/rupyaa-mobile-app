import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { errorHandler, getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { REGISTRATION_ERROR_MESSAGES } from '@/src/services/registration/registrationSubmit';
import {
  getCurrentJourneySubstepId,
  logJourneyStepSubmitted,
  logJourneyStepSubmitApiError,
  logJourneyStepSubmitUnknownError,
} from '@/src/services/logging/logPoolJourney';
import type { ApiResponse } from '@/src/types/api';

export type UseRegistrationSubmitOptions<TInput> = {
  mutationFn: (data: TInput) => Promise<ApiResponse<unknown>>;
  onSuccess: (response: ApiResponse<unknown>) => void;
  /**
   * Optional callback invoked when the API returns a failed response (success: false).
   * Return `true` to signal the error was handled — suppresses the default inline error message.
   * Return `false` (or omit) to fall through to the default error display.
   */
  onFailedResponse?: (response: ApiResponse<unknown>) => boolean;
};

export type UseRegistrationSubmitResult<TInput> = {
  submit: (data: TInput) => void;
  isPending: boolean;
  errorMessage: string;
  setErrorMessage: (msg: string) => void;
  clearError: () => void;
};

/**
 * Standardized mutation hook for registration steps.
 * Handles API success/error, displays user-friendly messages.
 */
export function useRegistrationSubmit<TInput>(
  options: UseRegistrationSubmitOptions<TInput>
): UseRegistrationSubmitResult<TInput> {
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (response) => {
      const stepId = getCurrentJourneySubstepId();
      if (response?.success) {
        logJourneyStepSubmitted(stepId);
        options.onSuccess(response);
      } else {
        logJourneyStepSubmitApiError(stepId, response?.error, response?.status);
        // Allow the caller to intercept specific error codes (e.g. ELIGIBILITY_REJECTED).
        const wasHandled = options.onFailedResponse?.(response) ?? false;
        if (!wasHandled) {
          setErrorMessage(
            getApiErrorDisplayMessage(response?.error) || REGISTRATION_ERROR_MESSAGES.generic
          );
        }
      }
    },
    onError: (error) => {
      logJourneyStepSubmitUnknownError(getCurrentJourneySubstepId(), error);
      setErrorMessage(errorHandler(error) || REGISTRATION_ERROR_MESSAGES.network);
    },
  });

  const clearError = () => setErrorMessage('');

  return {
    submit: mutate,
    isPending,
    errorMessage,
    setErrorMessage,
    clearError,
  };
}

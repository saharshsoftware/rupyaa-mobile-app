import { useQuery } from '@tanstack/react-query';
import { loanService } from './loanService';
import { consoleLogDev, getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import type { GetExistingActiveLoanResponse } from '@/src/types/loans';
import { REACT_QUERY_KEYS } from '@/src/constants/data';

type UseGetExistingActiveLoanOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

/**
 * React Query hook to fetch existing active loan from backend (GET /loans/get-existing-active-loan).
 * Handles loading, error states, and automatic retries.
 * Formats error messages for user-friendly display.
 */
export function useGetExistingActiveLoan(options?: UseGetExistingActiveLoanOptions) {
  const enabled = options?.enabled ?? true;

  const query = useQuery({
    queryKey: REACT_QUERY_KEYS.EXISTING_ACTIVE_LOAN,
    queryFn: async (): Promise<GetExistingActiveLoanResponse> => {
      const response = await loanService.getExistingActiveLoan();
      consoleLogDev('response from useGetExistingActiveLoan', response);
      if (!response.success) {
        const errorMessage =
          getApiErrorDisplayMessage(response.error) ||
          'Failed to fetch active loan. Please try again.';
        throw new Error(errorMessage);
      }
      return response.data as GetExistingActiveLoanResponse;
    },
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchInterval: options?.refetchInterval ?? false,
    retry: 1,
  });

  return query;
}

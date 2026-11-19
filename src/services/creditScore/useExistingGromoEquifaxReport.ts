import { useQuery } from '@tanstack/react-query';
import { isCreditScoreUnavailable } from '@/src/config/creditScore';
import { pullGromoEquifaxReport } from './gromoEquifaxService';
import type { CreditScorePullResponse } from '@/src/types/creditScore';

export const EXISTING_GROMO_EQUIFAX_REPORT_QUERY_KEY = [
  'credit-score', 'gromo-equifax', 'existing',
] as const;

function shouldKeepExistingResult(result: CreditScorePullResponse): boolean {
  if (!result.data) return false;
  // Keep unavailable scores (-1 / 0 / null) even when reportAvailable is false.
  if (isCreditScoreUnavailable(result.data.creditScore)) return true;
  return result.reportAvailable;
}

export function useExistingGromoEquifaxReport() {
  return useQuery<CreditScorePullResponse | null>({
    queryKey: EXISTING_GROMO_EQUIFAX_REPORT_QUERY_KEY,
    queryFn: async () => {
      const response = await pullGromoEquifaxReport({ checkOnly: true });
      if (!response.success || !response.data) return null;
      return shouldKeepExistingResult(response.data) ? response.data : null;
    },
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
  });
}

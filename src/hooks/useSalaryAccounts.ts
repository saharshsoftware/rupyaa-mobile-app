import { useQuery } from '@tanstack/react-query';
import { getSalaryAccounts } from '@/src/services/registration';
import type { SalaryAccountsResponse } from '@/src/types/kyc';
import { REACT_QUERY_KEYS } from '@/src/constants/data';
import { mapSalaryAccountsResponse } from '@/src/utils/mapSalaryAccountsResponse';

const EMPTY_SALARY_ACCOUNTS: SalaryAccountsResponse = {
  salaryAccounts: [],
};

type UseSalaryAccountsOptions = {
  enabled?: boolean;
};

/**
 * Fetches salary account hints (GET /user/salary-accounts) for the bank details step.
 * When appConfig.useSalaryAccountsFixture is true, getSalaryAccounts returns local dummy data.
 * On live API error returns empty data so the form remains submittable without validation.
 */
export function useSalaryAccounts(options?: UseSalaryAccountsOptions) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.SALARY_ACCOUNTS,
    queryFn: async (): Promise<SalaryAccountsResponse> => {
      const response = await getSalaryAccounts();
      if (!response.success) {
        return EMPTY_SALARY_ACCOUNTS;
      }
      return mapSalaryAccountsResponse(response.data);
    },
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

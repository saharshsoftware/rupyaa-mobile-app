import { useQuery } from '@tanstack/react-query';
import { getTicketFilterOptions } from '@/src/services/support';

export function useTicketFilterOptions() {
  return useQuery({
    queryKey: ['ticket-filter-options'],
    queryFn: async () => {
      const response = await getTicketFilterOptions();
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

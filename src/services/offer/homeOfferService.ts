import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import { offerService } from './offerService';

let refreshInFlight: Promise<void> | null = null;

export function refreshHomeOffer(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  const previousResponse = useCurrentOfferStore.getState().lastResponse;
  const refresh = async (): Promise<void> => {
    const response = await offerService.getCurrentOffer();
    if (!response.success && response.status !== 404) return;

    // A journey refresh or session reset may have replaced the offer while this request ran.
    const store = useCurrentOfferStore.getState();
    if (store.lastResponse !== previousResponse) return;
    store.setLastResponse(response);
  };

  refreshInFlight = refresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

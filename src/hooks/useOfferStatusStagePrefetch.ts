import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUserStage } from '@/src/services/user/useUserStage';

export interface UseOfferStatusStagePrefetchResult {
  /** True while the get-user-stage prefetch triggered by the modal opening is still in flight. */
  isResolvingStage: boolean;
  /** Resolves once the prefetch (or a fresh fetch, if none was in flight) has completed. */
  awaitResolvedStage: () => ReturnType<typeof fetchUserStage>;
}

/**
 * Prefetches get-user-stage while OfferStatusModal is visible so the OFFERINGS gate is
 * current before ApprovedOfferStep mounts. The showUpdateButton flag is not read from
 * user-stage context; it comes from the /offer/current snapshot used by that screen.
 */
export function useOfferStatusStagePrefetch(
  showOfferStatusModal: boolean
): UseOfferStatusStagePrefetchResult {
  const stageFetchRef = useRef<ReturnType<typeof fetchUserStage> | null>(null);
  const [isResolvingStage, setIsResolvingStage] = useState(false);

  useEffect(() => {
    if (!showOfferStatusModal) return;
    setIsResolvingStage(true);
    stageFetchRef.current = fetchUserStage().finally(() => setIsResolvingStage(false));
  }, [showOfferStatusModal]);

  const awaitResolvedStage = useCallback(() => {
    return stageFetchRef.current ?? fetchUserStage();
  }, []);

  return { isResolvingStage, awaitResolvedStage };
}

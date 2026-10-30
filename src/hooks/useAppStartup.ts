import { useEffect, useRef } from 'react';
// import { initAdjustSdk } from '@/src/hooks/useAdjustSdk';
import { runStartupTasks } from '@/src/services/startup';
import { useAuthStore } from '@/src/store/useAuthStore';
import { refreshAndStoreGeoLocation } from '@/src/services/location/geoLocation';
import { requestTrackingTransparencyIfNeeded } from '@/src/utils/ios-tracking-transparency';
import { initializeClarity } from '@/src/services/analytics';

export function useAppStartup(): void {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    void initializeClarity();

    (async () => {
      // Hydrate auth store before any network work so the token is available to all API calls.
      await useAuthStore.getState().hydrate();

      // iOS tracking permission is still used by other attribution integrations.
      await requestTrackingTransparencyIfNeeded();
      // Adjust SDK is temporarily disabled.
      // await initAdjustSdk();

      // Populate geo cache before startup tasks so X-Geo-Location header is correct on first API call
      await refreshAndStoreGeoLocation();
      void runStartupTasks();
    })();
  }, []);
}

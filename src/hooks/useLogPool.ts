import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { LOG_POOL_FLUSH_INTERVAL_MS } from '@/src/config/logging';
import { logPool } from '@/src/services/logging';

/** Survives React Strict Mode remounts so the flush interval is not torn down between double-mounts. */
let logPoolLifecycleStarted = false;

/**
 * Starts the logs pool lifecycle: load persisted logs, flush on interval (see LOG_POOL_FLUSH_INTERVAL_MS),
 * and flush when the app moves to background.
 */
export function useLogPool(): void {
  useEffect(() => {
    if (!logPoolLifecycleStarted) {
      logPoolLifecycleStarted = true;
      void logPool.init(LOG_POOL_FLUSH_INTERVAL_MS);
    }

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'background' || nextState === 'inactive') {
        void logPool.flush();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Do not call logPool.shutdown() here — Strict Mode cleanup would stop the flush timer.
    };
  }, []);
}

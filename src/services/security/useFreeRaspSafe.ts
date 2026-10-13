import { useEffect } from 'react';
import {
  onInvalidCallback,
  removeRaspExecutionStateEventListener,
  removeThreatListener,
  setRaspExecutionStateListener,
  setThreatListeners,
  talsecStart,
} from 'freerasp-react-native';
import type {
  RaspExecutionStateEventActions,
  TalsecConfig,
  ThreatEventActions,
} from 'freerasp-react-native';
import {
  markFreeRaspBootstrapFailed,
  markFreeRaspBootstrapStarted,
} from './freeRaspBootstrapGuard';
import { shouldSkipTalsecStart } from './freeRaspReloadGuard';

/**
 * Drop-in replacement for freerasp-react-native's useFreeRasp. That hook guards
 * double-starting the native SDK with a module-level JS flag, but
 * Updates.reloadAsync() (OTA "Update now") destroys and recreates the whole JS
 * VM without restarting the native process — the JS flag resets to false while
 * the native SDK is still running, so calling talsecStart() again crashes
 * natively. Skip the native start (but still re-register JS listeners) when
 * this boot is the relaunch from a just-applied OTA update.
 */
export const useFreeRaspSafe = (
  config: TalsecConfig,
  actions: ThreatEventActions,
  raspExecutionStateActions?: RaspExecutionStateEventActions
) => {
  useEffect(() => {
    (async () => {
      await setThreatListeners(actions);
      if (raspExecutionStateActions) {
        await setRaspExecutionStateListener(raspExecutionStateActions);
      }

      if (await shouldSkipTalsecStart()) {
        markFreeRaspBootstrapStarted();
        return;
      }

      try {
        const response = await talsecStart(config);
        if (response !== 'freeRASP started') {
          markFreeRaspBootstrapFailed();
          onInvalidCallback();
          return;
        }
        markFreeRaspBootstrapStarted();
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        const msg = String(err?.message ?? '').toLowerCase();
        const isAlreadyRunning = msg.includes('already') || msg.includes('consumed');
        if (isAlreadyRunning) {
          markFreeRaspBootstrapStarted();
          console.warn('[freeRASP] talsecStart skipped — SDK already running in native layer');
        } else {
          markFreeRaspBootstrapFailed();
          console.error(`[freeRASP] ${err.code ?? 'unknown'}: ${err.message ?? 'talsecStart failed'}`);
        }
      }
    })();

    return () => {
      (async () => {
        await removeThreatListener();
        await removeRaspExecutionStateEventListener();
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

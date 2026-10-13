import { Platform } from 'react-native';

import { appConfig } from '@/src/config/appConfig';
import { isTestOrReviewPhoneNumber } from '@/src/config/resolvedAppConfig';
import type { SecurityThreatId } from '@/src/types/deviceSecurity';

import { freeRaspConfigValid } from './freeRaspConfig';

const FREE_RASP_BOOTSTRAP_GRACE_MS = 8_000;
const MONITOR_NOT_STARTED: SecurityThreatId = 'SECURITY_MONITOR_NOT_STARTED';

type FreeRaspBootstrapStatus = 'pending' | 'started' | 'failed';

let bootstrapStatus: FreeRaspBootstrapStatus = 'pending';
const bootstrapStartedAtMs = Date.now();

/** True when a production (or dev-opt-in) native build must have freeRASP running. */
export function isFreeRaspBootstrapRequired(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }
  if (__DEV__ && !appConfig.enableFreeRaspInDev) {
    return false;
  }
  if (isTestOrReviewPhoneNumber()) {
    return false;
  }
  return true;
}

/** Call when talsecStart succeeds or the native SDK is already running after an OTA reload. */
export function markFreeRaspBootstrapStarted(): void {
  bootstrapStatus = 'started';
}

/** Call when talsecStart fails. A later success is not downgraded. */
export function markFreeRaspBootstrapFailed(): void {
  if (bootstrapStatus === 'started') {
    return;
  }
  bootstrapStatus = 'failed';
}

/**
 * Returns a blocking threat when freeRASP was required and did not start.
 * A short grace window avoids blocking a tap that happens while startup is still in flight.
 */
export function getFreeRaspBootstrapBlockThreat(): SecurityThreatId | null {
  if (!isFreeRaspBootstrapRequired()) {
    return null;
  }
  if (!freeRaspConfigValid || bootstrapStatus === 'failed') {
    return MONITOR_NOT_STARTED;
  }
  if (bootstrapStatus === 'started') {
    return null;
  }
  if (Date.now() - bootstrapStartedAtMs > FREE_RASP_BOOTSTRAP_GRACE_MS) {
    return MONITOR_NOT_STARTED;
  }
  return null;
}

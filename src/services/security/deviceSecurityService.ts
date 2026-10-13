import { Alert, BackHandler, Platform } from 'react-native';

import {
  selectIsLoanJourneyBlocked,
  useDeviceSecurityStore,
} from '@/src/store/deviceSecurityStore';
import { getSecurityThreatMessage, type SecurityThreatId } from '@/src/types/deviceSecurity';
import { clearSensitiveStateOnThreat, resetSensitiveThreatCleanup } from './clearSensitiveStateOnThreat';
import { getFreeRaspBootstrapBlockThreat } from './freeRaspBootstrapGuard';

const PRIVILEGED_ACCESS_THREAT: SecurityThreatId = 'ROOT_OR_JAILBREAK_DETECTED';

const handledHardExitThreats = new Set<string>();
const loggedBlockingThreats = new Set<string>();

const SECURITY_ALERT_TITLE = 'Security notice';

export const exitApp = (): void => {
  BackHandler.exitApp();
};

/**
 * Marks a threat that blocks the entire app.
 * Debounced logging — freeRASP may re-scan periodically.
 */
export const recordJourneyBlockingThreat = (threat: SecurityThreatId): void => {
  if (Platform.OS === 'web') {
    return;
  }

  useDeviceSecurityStore.getState().addBlockingThreat(threat);
  clearSensitiveStateOnThreat(threat === PRIVILEGED_ACCESS_THREAT);

  if (loggedBlockingThreats.has(threat)) {
    return;
  }

  loggedBlockingThreats.add(threat);
  console.warn('[freeRASP] App blocked:', threat);
};

export const isLoanJourneyBlocked = (): boolean =>
  selectIsLoanJourneyBlocked(useDeviceSecurityStore.getState());

export const getLoanJourneyBlockMessage = (): string => {
  const { blockingThreats } = useDeviceSecurityStore.getState();
  return getSecurityThreatMessage(blockingThreats[0]);
};

export const showLoanJourneyBlockedAlert = (): void => {
  Alert.alert(SECURITY_ALERT_TITLE, getLoanJourneyBlockMessage(), [{ text: 'OK' }], {
    cancelable: true,
  });
};

const applyFreeRaspBootstrapGate = (): void => {
  const bootstrapThreat = getFreeRaspBootstrapBlockThreat();
  if (bootstrapThreat) {
    recordJourneyBlockingThreat(bootstrapThreat);
  }
};

/** Re-check freeRASP before a sensitive screen renders, including deep links into the loan journey. */
export const enforceSensitiveEntrySecurity = (): void => {
  applyFreeRaspBootstrapGate();
};

/** Gate navigation into loan journey and other sensitive application flows. */
export const tryOpenLoanJourney = (onAllowed: () => void): void => {
  applyFreeRaspBootstrapGate();
  if (!isLoanJourneyBlocked()) {
    onAllowed();
    return;
  }
  showLoanJourneyBlockedAlert();
};

/**
 * Handles root/jailbreak detection from freeRASP `privilegedAccess`.
 * Root overlay uses the same threat message map as every other blocker.
 */
export const handlePrivilegedAccessDetected = (): void => {
  if (Platform.OS === 'web') {
    return;
  }

  recordJourneyBlockingThreat(PRIVILEGED_ACCESS_THREAT);

  if (handledHardExitThreats.has(PRIVILEGED_ACCESS_THREAT)) {
    return;
  }

  handledHardExitThreats.add(PRIVILEGED_ACCESS_THREAT);
  useDeviceSecurityStore.getState().markCompromised(PRIVILEGED_ACCESS_THREAT);

  // Optional: report to backend — api.post('/security/device-event', { event: PRIVILEGED_ACCESS_THREAT })
};

/** Clears session debounce + store — dev-panel testing only. */
export const resetDeviceSecuritySession = (): void => {
  handledHardExitThreats.clear();
  loggedBlockingThreats.clear();
  resetSensitiveThreatCleanup();
  useDeviceSecurityStore.getState().resetSecurityState();
};

import { consoleLogDev } from '@/src/utils/consoleLogDev';
import type { SecurityThreatId } from '@/src/types/deviceSecurity';

import {
  handlePrivilegedAccessDetected,
  recordJourneyBlockingThreat,
} from './deviceSecurityService';
import { markFreeRaspBootstrapFailed, markFreeRaspBootstrapStarted } from './freeRaspBootstrapGuard';
import { markFreeRaspNativeStarted } from './freeRaspReloadGuard';

/**
 * freeRASP threat callbacks — maps Talsec events to app responses.
 *
 * BLOCKED (loan journey gate via recordJourneyBlockingThreat):
 * - Debugger, emulator/simulator, app tampering, unofficial install source, hooking/Frida
 * - Android developer mode, ADB, system VPN, device ID/binding, missing secure hardware
 * - Obfuscation issues, multi-instance, time/location spoofing, unsecured Wi‑Fi, automation
 *
 * HARD EXIT (privilegedAccess → handlePrivilegedAccessDetected):
 * - Root / jailbreak
 *
 * LOG ONLY (detected but intentionally allowed — no user-facing block):
 * - No device screen lock / passcode (DEVICE_PASSCODE_NOT_SET)
 * - Screenshot / screen recording (DETECT_SCREEN_* permissions not used — Play policy)
 */

const logTalsecEvent = (event: SecurityThreatId) => {
  console.log('[freeRASP]', event);
};

const blockJourneyForThreat = (event: SecurityThreatId) => {
  logTalsecEvent(event);
  recordJourneyBlockingThreat(event);
};

export const freeRaspActions = {
  privilegedAccess: () => {
    logTalsecEvent('ROOT_OR_JAILBREAK_DETECTED');
    handlePrivilegedAccessDetected();
  },
  debug: () => blockJourneyForThreat('DEBUGGER_DETECTED'),
  simulator: () => blockJourneyForThreat('EMULATOR_OR_SIMULATOR_DETECTED'),
  appIntegrity: () => blockJourneyForThreat('APP_TAMPERING_OR_WRONG_SIGNATURE'),
  unofficialStore: () => blockJourneyForThreat('UNOFFICIAL_INSTALL_SOURCE'),
  hooks: () => blockJourneyForThreat('HOOKING_FRIDA_DETECTED'),
  devMode: () => blockJourneyForThreat('ANDROID_DEVELOPER_MODE_ON'),
  adbEnabled: () => blockJourneyForThreat('ADB_ENABLED'),
  systemVPN: () => blockJourneyForThreat('VPN_DETECTED'),
  // Screen lock not required — many users run without PIN/pattern; log for telemetry only.
  passcode: () => logTalsecEvent('DEVICE_PASSCODE_NOT_SET'),
  deviceID: () => blockJourneyForThreat('DEVICE_ID_DETECTED'),
  deviceBinding: () => blockJourneyForThreat('DEVICE_BINDING_DETECTED'),
  secureHardwareNotAvailable: () =>
    blockJourneyForThreat('SECURE_HARDWARE_NOT_AVAILABLE'),
  obfuscationIssues: () => blockJourneyForThreat('OBFUSCATION_ISSUE'),
  // Screenshot/recording detection requires DETECT_SCREEN_* permissions (blocked for Play policy).
  screenshot: () => logTalsecEvent('SCREENSHOT_DETECTED'),
  screenRecording: () => logTalsecEvent('SCREEN_RECORDING_DETECTED'),
  multiInstance: () => blockJourneyForThreat('MULTI_INSTANCE_DETECTED'),
  timeSpoofing: () => blockJourneyForThreat('TIME_SPOOFING_DETECTED'),
  locationSpoofing: () => blockJourneyForThreat('LOCATION_SPOOFING_DETECTED'),
  unsecureWifi: () => blockJourneyForThreat('UNSECURE_WIFI_DETECTED'),
  automation: () => blockJourneyForThreat('AUTOMATION_DETECTED'),
  started: () => {
    markFreeRaspBootstrapStarted();
    void markFreeRaspNativeStarted();
    consoleLogDev('[freeRASP] Initialized successfully');
  },
  initializationError: (message: string) => {
    markFreeRaspBootstrapFailed();
    console.warn('[freeRASP] Initialization failed:', message);
  },
};

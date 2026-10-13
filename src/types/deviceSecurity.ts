export type SecurityThreatId =
  | 'ROOT_OR_JAILBREAK_DETECTED'
  | 'DEBUGGER_DETECTED'
  | 'EMULATOR_OR_SIMULATOR_DETECTED'
  | 'APP_TAMPERING_OR_WRONG_SIGNATURE'
  | 'UNOFFICIAL_INSTALL_SOURCE'
  | 'HOOKING_FRIDA_DETECTED'
  | 'ANDROID_DEVELOPER_MODE_ON'
  | 'ADB_ENABLED'
  | 'VPN_DETECTED'
  | 'DEVICE_PASSCODE_NOT_SET'
  | 'DEVICE_ID_DETECTED'
  | 'DEVICE_BINDING_DETECTED'
  | 'SECURE_HARDWARE_NOT_AVAILABLE'
  | 'OBFUSCATION_ISSUE'
  | 'SCREENSHOT_DETECTED'
  | 'SCREEN_RECORDING_DETECTED'
  | 'MULTI_INSTANCE_DETECTED'
  | 'TIME_SPOOFING_DETECTED'
  | 'LOCATION_SPOOFING_DETECTED'
  | 'UNSECURE_WIFI_DETECTED'
  | 'AUTOMATION_DETECTED'
  | 'SECURITY_MONITOR_NOT_STARTED';

export const SECURITY_THREAT_USER_MESSAGES: Record<SecurityThreatId, string> = {
  ROOT_OR_JAILBREAK_DETECTED:
    'This device appears to be rooted or jailbroken. Rupyaa cannot run on modified devices.',
  DEBUGGER_DETECTED:
    'A debugger is attached to this device. For your security, Rupyaa is unavailable.',
  EMULATOR_OR_SIMULATOR_DETECTED:
    'This app is running on an emulator or simulator. Rupyaa requires a physical device.',
  APP_TAMPERING_OR_WRONG_SIGNATURE:
    'This app installation could not be verified. Please install Rupyaa from an official source.',
  UNOFFICIAL_INSTALL_SOURCE:
    'This app was not installed from an official store. Rupyaa is unavailable.',
  HOOKING_FRIDA_DETECTED:
    'Unauthorized tools were detected on this device. Rupyaa is unavailable.',
  ANDROID_DEVELOPER_MODE_ON:
    'Developer options are enabled on this device. Please turn them off to continue using Rupyaa.',
  ADB_ENABLED:
    'USB debugging is enabled on this device. Please turn it off to continue using Rupyaa.',
  VPN_DETECTED:
    'A system VPN is active. Please disable it to continue using Rupyaa.',
  DEVICE_PASSCODE_NOT_SET:
    'Your device does not have a screen lock enabled. Please set one to continue using Rupyaa.',
  DEVICE_ID_DETECTED:
    'This device could not be verified. Rupyaa is unavailable.',
  DEVICE_BINDING_DETECTED:
    'This device could not be verified. Rupyaa is unavailable.',
  SECURE_HARDWARE_NOT_AVAILABLE:
    'This device does not meet the secure hardware requirements for Rupyaa.',
  OBFUSCATION_ISSUE:
    'This app installation could not be verified. Please reinstall Rupyaa from an official source.',
  SCREENSHOT_DETECTED:
    'Screen capture was detected during a sensitive flow. Rupyaa is temporarily unavailable.',
  SCREEN_RECORDING_DETECTED:
    'Screen recording was detected. Rupyaa is temporarily unavailable.',
  MULTI_INSTANCE_DETECTED:
    'Multiple app instances were detected. Rupyaa is unavailable.',
  TIME_SPOOFING_DETECTED:
    'Incorrect device date or time was detected. Please fix your device settings to continue using Rupyaa.',
  LOCATION_SPOOFING_DETECTED:
    'Location spoofing was detected. Rupyaa is unavailable.',
  UNSECURE_WIFI_DETECTED:
    'An unsecured Wi‑Fi network was detected. Please switch networks to continue using Rupyaa.',
  AUTOMATION_DETECTED:
    'Automated interaction tools were detected. Rupyaa is unavailable.',
  SECURITY_MONITOR_NOT_STARTED:
    'We could not verify this device. Rupyaa is unavailable until you restart the app.',
};

export const DEFAULT_APP_BLOCK_MESSAGE =
  'This device does not meet security requirements to use Rupyaa.';

/** @deprecated Use DEFAULT_APP_BLOCK_MESSAGE */
export const DEFAULT_JOURNEY_BLOCK_MESSAGE = DEFAULT_APP_BLOCK_MESSAGE;

export function getSecurityThreatMessage(
  threat: SecurityThreatId | null | undefined
): string {
  if (!threat) {
    return DEFAULT_APP_BLOCK_MESSAGE;
  }
  return SECURITY_THREAT_USER_MESSAGES[threat] ?? DEFAULT_APP_BLOCK_MESSAGE;
}

import { NativeModules, Platform } from 'react-native';

export interface EarlySecurityStatus {
  debuggerAttached: boolean;
  suspiciousLibraryDetected: boolean;
}

interface EarlySecurityBootstrapNativeModule {
  getStatus: () => Promise<EarlySecurityStatus>;
}

function isEarlySecurityStatus(value: unknown): value is EarlySecurityStatus {
  if (typeof value !== 'object' || value == null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.debuggerAttached === 'boolean' &&
    typeof record.suspiciousLibraryDetected === 'boolean'
  );
}

/**
 * Reads the native probe captured in MainApplication.onCreate.
 * Returns null on iOS, web, and binaries built before the plugin was applied.
 */
export async function readEarlySecurityStatus(): Promise<EarlySecurityStatus | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  const nativeModule = NativeModules.EarlySecurityBootstrap as
    | EarlySecurityBootstrapNativeModule
    | undefined;
  if (!nativeModule?.getStatus) {
    return null;
  }
  const status = await nativeModule.getStatus();
  if (!isEarlySecurityStatus(status)) {
    return null;
  }
  return status;
}

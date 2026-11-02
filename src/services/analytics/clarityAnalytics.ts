import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { envConfig } from '@/src/config/envConfig';
import { consoleLogDev } from '@/src/utils/consoleLogDev';

let hasInitialized = false;
let resolveClarityReady: () => void = () => {};
let rejectClarityReady: (error: unknown) => void = () => {};

export const clarityReadyPromise = new Promise<void>((resolve, reject) => {
  resolveClarityReady = resolve;
  rejectClarityReady = reject;
});

export function isClarityEnabled(): boolean {
  return (
    Platform.OS !== 'web' &&
    Constants.appOwnership !== 'expo' &&
    Boolean(envConfig.clarityProjectId)
  );
}

export async function initializeClarity(): Promise<void> {
  if (hasInitialized || !isClarityEnabled()) {
    if (!isClarityEnabled()) {
      resolveClarityReady();
    }
    return;
  }

  hasInitialized = true;

  try {
    const Clarity = await import('@microsoft/react-native-clarity');

    Clarity.initialize(envConfig.clarityProjectId, {
      logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None,
    });

    consoleLogDev('[analytics][clarity] initialization requested');
    resolveClarityReady();
  } catch (error) {
    hasInitialized = false;
    consoleLogDev('[analytics][clarity] initialization failed', { error });
    rejectClarityReady(error);
  }
}

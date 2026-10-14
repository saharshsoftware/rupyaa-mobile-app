import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { envConfig } from '@/src/config/envConfig';
import { consoleLogDev } from '@/src/utils/consoleLogDev';

let hasInitialized = false;

export async function initializeClarity(): Promise<void> {
  if (
    hasInitialized ||
    Platform.OS === 'web' ||
    Constants.appOwnership === 'expo' ||
    !envConfig.clarityProjectId
  ) {
    return;
  }

  hasInitialized = true;

  try {
    const Clarity = await import('@microsoft/react-native-clarity');

    Clarity.initialize(envConfig.clarityProjectId, {
      logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None,
    });

    consoleLogDev('[analytics][clarity] initialization requested');
  } catch (error) {
    hasInitialized = false;
    consoleLogDev('[analytics][clarity] initialization failed', { error });
  }
}

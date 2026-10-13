import { Platform } from 'react-native';
import { isEmulator } from 'react-native-device-info';
import { Adjust, AdjustConfig } from 'react-native-adjust';
import { envConfig } from '@/src/config/envConfig';
import { consoleLogDev } from '@/src/utils/common-helper';
import { pushAdjustAttributionCaptured } from '@/src/services/logging';

/**
 * Initialise Adjust once. Call after App Tracking Transparency on iOS so IDFA-related
 * work does not run before the user responds to ATT.
 * Safe to call on Android (no ATT); skips web, emulator/simulator, and missing token.
 */
export async function initAdjustSdk(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  if (await isEmulator()) {
    return;
  }

  const appToken = envConfig.adjustAppToken?.trim();
  if (!appToken) {
    return;
  }

  const environment = __DEV__
    ? AdjustConfig.EnvironmentSandbox
    : AdjustConfig.EnvironmentProduction;
  const adjustConfig = new AdjustConfig(appToken, environment);

  if (__DEV__) {
    adjustConfig.setLogLevel(AdjustConfig.LogLevelVerbose);
  }

  const fbAppId = envConfig.fbAppId?.trim();
  if (fbAppId) {
    adjustConfig.setFbAppId(fbAppId);
  }

  // Must be set before initSdk — fires whenever Adjust resolves/updates attribution
  // (campaign/adgroup/creative), including the first resolution after install.
  adjustConfig.setAttributionCallback((attribution) => {
    console.log('[Adjust] Attribution changed', attribution);
    pushAdjustAttributionCaptured({
      network: attribution?.network ?? '',
      campaign: attribution?.campaign ?? '',
      adgroup: attribution?.adgroup ?? '',
      creative: attribution?.creative ?? '',
      trackerToken: attribution?.trackerToken ?? '',
    });
  });

  Adjust.initSdk(adjustConfig);
}

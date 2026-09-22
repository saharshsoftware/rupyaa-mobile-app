import * as Updates from 'expo-updates';
import { consoleLogDev } from '../utils/consoleLogDev';

/**
 * In release builds, OTA/bundling can accidentally inline the wrong EXPO_PUBLIC_* values
 * if Expo merges `.env` into the process. Prefer the update channel for dev-vs-prod behavior
 * so production channel never behaves like a dev build even when env is wrong.
 */
function resolveIsDevelopment(): boolean {
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_APP_ENV === 'development';
  }
  const channel = Updates.channel;
  if (channel === 'production') {
    return false;
  }
  if (channel === 'preview' || channel === 'development') {
    return true;
  }
  return process.env.EXPO_PUBLIC_APP_ENV === 'development';
}

function resolveApiUrl(): string {
  // Local development / Expo Go / dev client
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_API_URL ?? 'https://api-staging.rupyaa.com';
  }

  const channel = Updates.channel;

  consoleLogDev('[resolveApiUrl] channel:', channel);

  switch (channel) {
    case 'production':
      return 'https://api.rupyaa.com';

    case 'preview':
      return 'https://api-staging.rupyaa.com';

    default:
      // unknown or missing channel in release build
      console.warn('[resolveApiUrl] Unknown channel, using staging fallback:', channel);
      return 'https://api-staging.rupyaa.com';
  }
}

function resolveNgrokApiUrl(): string {
  if (!__DEV__ && Updates.channel === 'production') {
    return '';
  }
  return process.env.EXPO_PUBLIC_NGROK_API_URL ?? '';
}

export const envConfig = {
  apiUrl: resolveApiUrl(),
  ngrokApiUrl: resolveNgrokApiUrl(),
  amanNgrokApiUrl: 'https://grimy-victoria-uninduced.ngrok-free.dev',
  staging2ApiUrl:'https://api-staging.rupyaa.com',
  stagingApiUrl: 'https://api-staging.rupyaa.com',
  isDevelopment: resolveIsDevelopment(),
  adjustAppToken: process.env.EXPO_PUBLIC_ADJUST_APP_TOKEN ?? '',
  fbAppId: process.env.EXPO_PUBLIC_FB_APP_ID ?? '',
  encryptionSecret:
    process.env.EXPO_PUBLIC_API_ENCRYPTION_SECRET ??
    process.env.EXPO_PUBLIC_TEST_ENCRYPTION_SECRET ??
    '',
};
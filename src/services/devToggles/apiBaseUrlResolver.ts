import { appConfig } from '@/src/config/appConfig';
import { envConfig } from '@/src/config/envConfig';

export const STAGING_API_OVERRIDE = {
  none: 'none',
  staging2: 'staging2',
  staging: 'staging',
  emi: 'emi',
} as const;

export type StagingApiOverride =
  (typeof STAGING_API_OVERRIDE)[keyof typeof STAGING_API_OVERRIDE];

export const isStagingApiOverride = (value: string): value is StagingApiOverride =>
  value === STAGING_API_OVERRIDE.none ||
  value === STAGING_API_OVERRIDE.staging2 ||
  value === STAGING_API_OVERRIDE.staging ||
  value === STAGING_API_OVERRIDE.emi;

const getStagingApiOverride = (): StagingApiOverride => {
  const overrideValue = (appConfig as { stagingApiOverride?: string }).stagingApiOverride;
  return overrideValue && isStagingApiOverride(overrideValue)
    ? overrideValue
    : STAGING_API_OVERRIDE.none;
};

export const setStagingApiOverride = (value: StagingApiOverride): void => {
  (appConfig as { stagingApiOverride: StagingApiOverride }).stagingApiOverride = value;
};

const resolveApiBaseUrl = (): string => {
  // Keep ngrok as highest priority for local backend testing.
  if (appConfig.useAdityaNgrokApiBaseUrl) {
    return envConfig.adityaNgrokApiUrl;
  }

  if (appConfig.useAmanNgrokApiBaseUrl) {
    return envConfig.amanNgrokApiUrl;
  }

  if (appConfig.useNgrokApiBaseUrl && envConfig.ngrokApiUrl) {
    return envConfig.ngrokApiUrl;
  }

  const stagingApiOverride = getStagingApiOverride();

  if (stagingApiOverride === STAGING_API_OVERRIDE.staging2) {
    return envConfig.staging2ApiUrl;
  }

  if (stagingApiOverride === STAGING_API_OVERRIDE.staging) {
    return `${envConfig.stagingApiUrl}/api/v1`;
  }

  if (stagingApiOverride === STAGING_API_OVERRIDE.emi) {
    return envConfig.emiApiUrl;
  }

  return envConfig.isDevelopment ? envConfig.apiUrl : `${envConfig.apiUrl}/api/v1`;
};

type ApiBaseUrlListener = (baseUrl: string) => void;

const apiBaseUrlListeners = new Set<ApiBaseUrlListener>();
let currentApiBaseUrl = resolveApiBaseUrl();

const notifyApiBaseUrlListeners = (baseUrl: string): void => {
  apiBaseUrlListeners.forEach((listener) => listener(baseUrl));
};

export const getCurrentApiBaseUrl = (): string => currentApiBaseUrl;

export const syncApiBaseUrl = (): string => {
  const nextBaseUrl = resolveApiBaseUrl();
  if (nextBaseUrl !== currentApiBaseUrl) {
    currentApiBaseUrl = nextBaseUrl;
    notifyApiBaseUrlListeners(currentApiBaseUrl);
  }
  return currentApiBaseUrl;
};

export const subscribeToApiBaseUrl = (
  listener: ApiBaseUrlListener,
): (() => void) => {
  apiBaseUrlListeners.add(listener);
  return () => {
    apiBaseUrlListeners.delete(listener);
  };
};

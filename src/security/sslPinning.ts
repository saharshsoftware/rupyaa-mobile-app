import {
  addSslPinningErrorListener,
  disableSslPinning,
  initializeSslPinning,
  isSslPinningAvailable as isNativeSslPinningAvailable,
  type PinningOptions,
} from 'react-native-ssl-public-key-pinning';
import { API_ENDPOINTS, apiConfig, apiHeaders } from '@/src/config/api';

import { fetchAndStoreAppConfig } from '@/src/hooks/useExternalAppConfig';
import { useAppConfigStore } from '@/src/store/useAppConfigStore';
import {
  getSslIncludeSubdomains,
  getSslPinningExpirationDate,
  getSslPublicKeyHashes,
} from '@/src/config/resolvedAppConfig';

const FORCE_SSL_PINNING_FAILURE = false;
const PINNED_API_VERIFICATION_TIMEOUT_MS = 7000;

/**
 * Build pinning options for the current API host from app-config (with static
 * fallback). Only the company-owned API host is pinned; third-party/lender
 * domains are left alone because their cert rotation is outside our control.
 */
const buildPinningOptions = (): PinningOptions => ({
  [getHostname(apiConfig.baseUrl)]: {
    includeSubdomains: getSslIncludeSubdomains(),
    publicKeyHashes: getSslPublicKeyHashes(),
    expirationDate: getSslPinningExpirationDate(),
  },
});

const buildTestFailureOptions = (options: PinningOptions): PinningOptions =>
  Object.fromEntries(
    Object.keys(options).map((hostname) => [
    hostname,
    {
      
      publicKeyHashes: [
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
      ],
    },
  ]),
);

let sslPinningInitialized = false;
let sslPinningSubscription: { remove: () => void } | null = null;
let sslPinningErrorHandler: ((hostname: string) => void) | null = null;

export const isSslPinningAvailable = (): boolean => isNativeSslPinningAvailable();

const isSslPinningEnabledByAppConfig = (): boolean => {
  const { config, status } = useAppConfigStore.getState();
  return status === 'ready' && config?.enableSslPinning === true;
};

const logSslPinningState = (message: string, extra?: Record<string, unknown>): void => {
  console.log('[SSL Pinning]', {
    message,
    enabled: isSslPinningEnabledByAppConfig(),
    nativeAvailable: isSslPinningAvailable(),
    appEnv: process.env.EXPO_PUBLIC_APP_ENV,
    forceFailure: FORCE_SSL_PINNING_FAILURE,
    ...extra,
  });
};

const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const verifyPinnedApiConnection = async (
  onPinMismatch?: (hostname: string) => void,
): Promise<void> => {
  const url = `${apiConfig.baseUrl}${API_ENDPOINTS.external.encryptionStatus}`;
  const hostname = getHostname(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PINNED_API_VERIFICATION_TIMEOUT_MS);

  try {
    logSslPinningState('verifying pinned API connection', { hostname });
    await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: apiHeaders.getCommon(),
      signal: controller.signal,
    });
    logSslPinningState('pinned API connection verified', { hostname });
  } catch (error) {
    console.error('[SSL Pinning] Pinned API verification failed', {
      hostname,
      error: error instanceof Error ? error.message : String(error),
    });
    onPinMismatch?.(hostname);
  } finally {
    clearTimeout(timeoutId);
  }
};

const ensureSslPinningErrorListener = (onPinMismatch?: (hostname: string) => void): void => {
  if (onPinMismatch) {
    sslPinningErrorHandler = onPinMismatch;
  }

  if (sslPinningSubscription) {
    return;
  }

  sslPinningSubscription = addSslPinningErrorListener((error) => {
    const hostname = error.serverHostname;

    console.error('[SSL Pinning] Pin mismatch', {
      hostname,
    });
    sslPinningErrorHandler?.(hostname);
  });
};

export const setupSslPinning = async (onPinMismatch?: (hostname: string) => void): Promise<void> => {
   // Config-first: pin values come from /external/config. Dedupes with the
  // routing gate's fetch. The first fetch on a fresh install is unavoidably
  // unpinned (config lives on the host we pin), then pinning applies.
  if (isSslPinningAvailable()) {
    await disableSslPinning();
    sslPinningInitialized = false;
    sslPinningSubscription?.remove();
    sslPinningSubscription = null;
    sslPinningErrorHandler = null;
  }

  await fetchAndStoreAppConfig();

  if (!isSslPinningEnabledByAppConfig()) {
    logSslPinningState('disabled by app-config');
    return;
  }

  if (sslPinningInitialized) {
    if (!sslPinningSubscription && isSslPinningAvailable()) {
      ensureSslPinningErrorListener(onPinMismatch);
    } else if (onPinMismatch) {
      sslPinningErrorHandler = onPinMismatch;
    }

    logSslPinningState('already initialized');
    return;
  }

  if (!isSslPinningAvailable()) {
    if (__DEV__) {
      console.warn('[SSL Pinning] Native module unavailable. Are you using Expo Go?');
      return;
    }

    throw new Error('SSL pinning native module is unavailable in production build');
  }


  const resolvedOptions = buildPinningOptions();
  const host = getHostname(apiConfig.baseUrl);

  // Never initialize with an empty hash set — that could block all traffic to
  // the API host. Skip pinning and let the request proceed unpinned instead.
  if ((resolvedOptions[host]?.publicKeyHashes?.length ?? 0) === 0) {
    logSslPinningState('skipped: no public key hashes resolved', { host });
    return;
  }


  const options = FORCE_SSL_PINNING_FAILURE 
    ? buildTestFailureOptions(resolvedOptions)
    : resolvedOptions;

  logSslPinningState('initializing', {
    domains: Object.keys(options),
  });

  await initializeSslPinning(options);
  ensureSslPinningErrorListener(onPinMismatch);
  sslPinningInitialized = true;
  logSslPinningState('initialized', {
    domains: Object.keys(options),
  });
  await verifyPinnedApiConnection(onPinMismatch);
};

export const cleanupSslPinningListener = (): void => {
  sslPinningSubscription?.remove();
  sslPinningSubscription = null;
  sslPinningErrorHandler = null;
};

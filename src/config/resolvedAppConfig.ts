import { useAppConfigStore } from '@/src/store/useAppConfigStore';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';
import { appConfig } from '@/src/config/appConfig';
import { envConfig } from './envConfig';

/**
 * Reads a value from the external app-config store, with fallback to static appConfig.
 * Used for keys that come from GET /external/app-config (when loaded) with static fallbacks.
 */
function getFromStore<K extends string, T>(key: K, fallback: T): T {
  const value = useAppConfigStore.getState().config?.[key];
  return (value !== undefined && value !== null ? value : fallback) as T;
}

export function getHyperKycWorkflowId(): string {
  return getFromStore('hyperKycWorkflowId', appConfig.hyperKycWorkflowId) ?? appConfig.hyperKycWorkflowId;
}

export function getHyperKycSdkVersion(): string {
  return getFromStore('hyperKycSdkVersion', appConfig.hyperKycSdkVersion) ?? appConfig.hyperKycSdkVersion;
}

export function getCredeauServerUrl(): string {
  return getFromStore('credeauServerUrl', appConfig.credeauServerUrl) ?? appConfig.credeauServerUrl;
}

export function getCredeauClientName(): string {
  return getFromStore('credeauClientName', appConfig.credeauClientName) ?? appConfig.credeauClientName;
}

export function getCredeauClientKey(): string {
  return getFromStore('credeauClientKey', appConfig.credeauClientKey) ?? appConfig.credeauClientKey;
}

export function getBackgroundSyncIntervalSeconds(): number {
  return getFromStore('backgroundSyncIntervalSeconds', appConfig.backgroundSyncIntervalSeconds) ?? appConfig.backgroundSyncIntervalSeconds;
}

/**
 * Max inbox SMS to sync per Android run (app-config). Invalid or zero falls back to static default.
 */
export function getMaxSmsToSync(): number {
  const fallback = appConfig.maxSmsToSync;
  const raw = getFromStore('maxSmsToSync', fallback) ?? fallback;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return Math.max(1, Math.floor(fallback));
  }
  return Math.max(1, Math.floor(n));
}

export function getGoogleClientId(): string {
  return getFromStore('googleClientId', appConfig.googleClientId) ?? appConfig.googleClientId;
}

export function getAndroidGoogleClientId(): string {
  return getFromStore('androidGoogleClientIdRupyaa', appConfig.androidGoogleClientIdRupyaa) ?? appConfig.androidGoogleClientIdRupyaa;
}

export function getIosGoogleClientId(): string {
  return getFromStore('iosGoogleClientId', appConfig.iosGoogleClientId) ?? appConfig.iosGoogleClientId;
}

type CashfreeEnvConfigKey = 'cashfreEnvironment' | 'cashFreeEnachEnvironment';

/** True after GET /external/config succeeded and `config` is stored (see `fetchAndStoreAppConfig`). */
export function isAppConfigReady(): boolean {
  const { status, config } = useAppConfigStore.getState();
  return status === 'ready' && config != null;
}

/**
 * Resolves Cashfree env from app-config, then forces SANDBOX for Play Store review numbers
 * so reviewers never hit production gateways (drop checkout + E-NACH stay aligned).
 *
 * If `config` is still null (app-config not loaded), falls back to static `appConfig`.
 * Payment flows should `await fetchAndStoreAppConfig()` before opening Cashfree so remote values apply.
 */
function getCashfreeEnvironmentRawWithPlayStoreOverride(
  configKey: CashfreeEnvConfigKey,
  fallback: string
): string {
  const raw = getFromStore(configKey, fallback);
  const resolved = typeof raw === 'string' ? raw : fallback;
  const config = useAppConfigStore.getState().config;
  console.log('config', config);
  const playStoreNumbers = config?.playStorePhoneNumbers;
  if (Array.isArray(playStoreNumbers) && playStoreNumbers.length > 0) {
    const userPhone = useUserDetailsStore.getState().personalDetails?.phoneNumber;
    if (userPhone && playStoreNumbers.includes(userPhone)) {
      return 'SANDBOX';
    }
  }

  return resolved;
}

/**
 * Cashfree E-NACH gateway environment from app-config. "SANDBOX" or "PRODUCTION".
 * Play Store review phone numbers (playStorePhoneNumbers) always get SANDBOX
 * so real mandates are never created during Google review.
 */
export function getCashfreeEnachEnvironmentRaw(): string {
  return getCashfreeEnvironmentRawWithPlayStoreOverride(
    'cashFreeEnachEnvironment',
    appConfig.cashFreeEnachEnvironment
  );
}

/**
 * Cashfree gateway environment from app-config. "SANDBOX" or "PRODUCTION".
 * Fallback: static appConfig.cashfreEnvironment when key missing or not yet loaded.
 * Same Play Store SANDBOX override as E-NACH so drop checkout (GPay/UPI) matches mandate flows during review.
 */
export function getCashfreeEnvironmentRaw(): string {
  return getCashfreeEnvironmentRawWithPlayStoreOverride(
    'cashfreEnvironment',
    appConfig.cashfreEnvironment
  );
}

/**
 * True when the current user's phone number is a Play Store review or internal test number
 * (playStorePhoneNumbers / internalTestPhoneNumbers from app-config). Used to disable freeRASP
 * for these numbers so reviewer/tester devices aren't flagged as security threats.
 *
 * Same data source/timing as the Cashfree Play Store override above: relies on
 * useUserDetailsStore.personalDetails, which is only populated post-login.
 */
export function isTestOrReviewPhoneNumber(): boolean {
  const config = useAppConfigStore.getState().config;
  const numbers = [
    ...(Array.isArray(config?.playStorePhoneNumbers) ? config.playStorePhoneNumbers : []),
    ...(Array.isArray(config?.internalTestPhoneNumbers) ? config.internalTestPhoneNumbers : []),
  ];
  if (numbers.length === 0) {
    return false;
  }

  const userPhone = useUserDetailsStore.getState().personalDetails?.phoneNumber;
  return !!userPhone && numbers.includes(userPhone);
}

/**
 * Bypass SMS permission (Android). Supports both API spellings: byPassSmsPermission and byPassSmsPermssion.
 * Coerces to boolean to guard against string/"true" values from the API.
 */
export function getByPassSmsPermission(): boolean {
  const config = useAppConfigStore.getState().config;
  // Check both spellings the backend may use
  const raw: unknown = config?.['byPassSmsPermission'] ?? config?.['byPassSmsPermssion'];
  if (raw === undefined || raw === null) return appConfig.byPassSmsPermission;
  return raw === true || raw === 'true';
}

/**
 * Whether the Contacts menu is shown in the Account screen (from app-config showGoogleContacts flag).
 * Fallback: static appConfig.showGoogleContacts when key missing or not yet loaded.
 */
export function getShowContacts(): boolean {
  return getFromStore('showGoogleContacts', appConfig.showGoogleContacts) ?? appConfig.showGoogleContacts;
}

/**
 * Request device contacts on /permissions when enabled (static or /external/app-config).
 * Coerces to boolean to guard against string/"true" values from the API.
 */


export function getEnableUpfrontContactsPermission(): boolean {
  return false
}

/**
 * Pre-ENACH review gate from /external/app-config.
 * Intentionally does not fallback to static config: gate is enabled only when API explicitly sends true.
 */
export function getEnablePreEnachReview(): boolean {
  const value = useAppConfigStore.getState().config?.enablePreEnachReview;
  return value === true;
}




/**
 * SSL pinning master switch (from /external/config). Falls back to static
 * appConfig.sslPinning.enabled when config isn't loaded yet.
 */
export function getEnableSslPinning(): boolean {
  return getFromStore('enableSslPinning', appConfig.sslPinning.enabled) ?? appConfig.sslPinning.enabled;
}

/**
 * Base64 public-key hashes to pin. Falls back to static hashes when the
 * config value is missing or not a non-empty string array (never pin on empty).
 */
export function getSslPublicKeyHashes(): string[] {
  const raw = useAppConfigStore.getState().config?.publicKeyHashes;
  if (Array.isArray(raw) && raw.length > 0 && raw.every((h) => typeof h === 'string' && h.length > 0)) {
    return raw;
  }
  return appConfig.sslPinning.publicKeyHashes;
}

export function getSslIncludeSubdomains(): boolean {
  return getFromStore('includeSubdomains', appConfig.sslPinning.includeSubdomains) ?? appConfig.sslPinning.includeSubdomains;
}

/**
 * Pinning expiry as YYYY-MM-DD. Backend sends an ISO date-time
 * (e.g. "2026-11-04T00:00:00.000Z"); the native lib wants date-only.
 */
export function getSslPinningExpirationDate(): string {
  const raw = getFromStore('sslPinningExpirationDate', appConfig.sslPinning.expirationDate);
  const value = typeof raw === 'string' && raw.length > 0 ? raw : appConfig.sslPinning.expirationDate;
  return value.split('T')[0];
}


/**
 * Whether API request/response encryption is enabled (from GET /external/encryption-status).
 * Returns false until encryption-status has been fetched; safe for first request before startup completes.
 */
export function getEnableEncryption(): boolean {
  const value = useAppConfigStore.getState().encryptionEnabled;
  return value === true;
}

/**
 * Shared secret for API payload encryption/decryption. Must match backend ENCRYPTION_SECRET.
 * Order: app-config store (if set) → EXPO_PUBLIC_API_ENCRYPTION_SECRET → EXPO_PUBLIC_TEST_ENCRYPTION_SECRET → dev default.
 */
export function getEncryptionSecret(): string {
  return envConfig.encryptionSecret;
}

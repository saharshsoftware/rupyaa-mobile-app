/**
 * Provider toggle — exactly one provider should be `true` at a time.
 * Keyed by provider name so new providers can be added without code changes.
 */
export type ProviderToggle = Record<string, boolean>;

/**
 * Shape of the `data` field returned by GET /external/app-config.
 * New top-level flags / provider groups can be added on the backend
 * and will be captured by the index signature.
 */
export interface ExternalAppConfigData {
  faceKycProvider: ProviderToggle;
  esignProvider: ProviderToggle;
  bankVerificationProvider: ProviderToggle;
  callPlatform: ProviderToggle;
  whatsappProvider: ProviderToggle;
  bsaFlow: ProviderToggle;
  googleAuth: boolean;

  /** HyperVerge KYC workflow id (e.g. "selfie") */
  hyperKycWorkflowId?: string;
  /** HyperKYC SDK version (e.g. "10.3.0") */
  hyperKycSdkVersion?: string;
  /** CredEau device-sync API base URL */
  credeauServerUrl?: string;
  /** Web OAuth client ID for Google Sign-In */
  googleClientIdRupyaa?: string;
  /** Android OAuth client ID for Google Sign-In */
  androidGoogleClientIdRupyaa?: string;
  /** iOS OAuth client ID for Google Sign-In */
  iosGoogleClientId?: string;
  /** When true, skip requesting READ_SMS on Android */
  byPassSmsPermission?: boolean;
  /** API typo variant — support both spellings */
  byPassSmsPermssion?: boolean;
  /** Cashfree E-NACH gateway environment: "SANDBOX" or "PRODUCTION" */
  cashFreeEnachEnvironment?: string;
  /** Cashfree gateway environment: "SANDBOX" or "PRODUCTION" */
  cashfreEnvironment?: string;
  /** When true, show the Contacts menu in the Account screen */
  showGoogleContacts?: boolean;
  /** When true, users must complete internal review before ENACH and E-sign. */
  enablePreEnachReview?: boolean;
  /** Credeau client name for device-sync (e.g. "rupyaa") */
  credeauClientName?: string;
  /** Credeau client key (UUID) for device-sync */
  credeauClientKey?: string;
  /** Background sync interval in seconds for Credeau device-sync */
  backgroundSyncIntervalSeconds?: number;
  /** Max inbox SMS messages to read/upload per Android sync run (Credeau) */
  maxSmsToSync?: number;


  /** Master switch for SSL public-key pinning (from /external/config) */
  enableSslPinning?: boolean;
  /** Base64 SHA-256 public-key hashes to pin for the API host */
  publicKeyHashes?: string[];
  /** Whether pinning also applies to subdomains of the API host */
  includeSubdomains?: boolean;
  /** Pinning expiry; ISO date-time, normalized to YYYY-MM-DD before use */
  sslPinningExpirationDate?: string;

  /** Phone numbers used for Play Store review; force SANDBOX for Cashfree E-NACH */
  playStorePhoneNumbers?: string[];

  internalTestPhoneNumbers?: string[];

  /** Catch-all for future flags the backend may add */
  [key: string]: ProviderToggle | boolean | string | number | string[] | undefined;
}

/**
 * Full API response wrapper for the app-config endpoint.
 */
export interface ExternalAppConfigResponse {
  success: boolean;
  data: ExternalAppConfigData;
}

/**
 * Response shape for GET /external/encryption-status (public API).
 * Use this to determine whether API request/response encryption is enabled.
 */
export interface EncryptionStatusResponse {
  success: boolean;
  enableEncryption?: boolean;
}

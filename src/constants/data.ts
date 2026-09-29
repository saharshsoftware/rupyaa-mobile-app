import { LANGUAGE_LABELS } from "../config/languages";
import { OnboardingLanguageOption } from "../types/common";

export const STRING_DATA = {
  APP_NAME: 'Rupyaa',
};

export const DEFAULT_ACTIVE_LOAN_AMOUNT = 500000;

export const APP_ICON = {
  SIZE: 20,
}

export const STORAGE_KEYS = {
  DEVICE_ID: `${STRING_DATA.APP_NAME}_DEVICE_ID`,
  GEO_LOCATION: `${STRING_DATA.APP_NAME}_GEO_LOCATION`,
  hasSeenOnboarding: 'hasSeenOnboarding',
  hasSelectedLanguage: 'hasSelectedLanguage',
  isPhoneVerified: 'isPhoneVerified',
  hasGrantedPermissions: 'hasGrantedPermissions',
  /** Last successful Credeau inbox SMS sync (epoch ms); used for 24h minimum interval. */
  lastLocalInboxSmsSyncAt: `${STRING_DATA.APP_NAME}_LAST_LOCAL_INBOX_SMS_SYNC_AT`,
  registrationStep: 'registrationStep',
  registrationData: 'registrationData',
  useNgrokApiBaseUrl: 'useNgrokApiBaseUrl',
  useAmanNgrokApiBaseUrl: 'useAmanNgrokApiBaseUrl',
  stagingApiOverride: 'stagingApiOverride',
  useBankStatementUploader: 'useBankStatementUploader',
  SKIPPED_UPDATE_VERSION: `${STRING_DATA.APP_NAME}_SKIPPED_UPDATE_VERSION`,
  /** Android Play Install Referrer JSON cache (see playInstallReferrerService). */
  playInstallReferrer: `${STRING_DATA.APP_NAME}_PLAY_INSTALL_REFERRER`,
  /** Unsent client logs awaiting batch upload (see logPoolService). */
  pendingLogs: `${STRING_DATA.APP_NAME}_PENDING_LOGS`,
  /** Verified mobile number for log pool lines (set after OTP success). */
  verifiedPhoneNumber: `${STRING_DATA.APP_NAME}_VERIFIED_PHONE`,
  /** Timestamp set right before an OTA reloadAsync(); freeRASP uses it to skip re-starting the native SDK on the relaunch (see freeRaspReloadGuard). */
  freeRaspOtaReloadAt: `${STRING_DATA.APP_NAME}_FREERASP_OTA_RELOAD_AT`,
  /** Timestamp when talsecStart() succeeded; used to skip re-init after OTA reload when the reload flag was not set (see freeRaspReloadGuard). */
  freeRaspNativeStartedAt: `${STRING_DATA.APP_NAME}_FREERASP_NATIVE_STARTED_AT`,
  /** User's selected UI language (see useLocaleStore); falls back to device locale when unset. */
  languagePreference: `${STRING_DATA.APP_NAME}_LANGUAGE_PREFERENCE`,
};


export const REACT_QUERY_KEYS = {
  BANK_STATEMENT_STATUS: ['user', 'bankStatementStatus'] as const,
  DOCUMENT_REQUESTS_USER: ['document-requests-user'] as const,
  USER_STAGE_USER: ['user', 'stage'] as const,
  JSON_PLACEHOLDER_USERS: ['jsonPlaceholderUsers'] as const,
  ADHAAR_IMAGE: ['kyc', 'adhaar-image'] as const,
  DIGILOCKER_STATUS: ['digilocker', 'status'] as const,
  HYPERKYC_ACCESS_TOKEN: ['kyc', 'hyperkyc'] as const,
  ALL_USER_LOANS: ['loans', 'all-user-loans'] as const,
  EXISTING_ACTIVE_LOAN: ['loans', 'existing-active-loan'] as const,
  /** GET /mandates/should-stop-before-nach — pre-NACH gate on enach/esign substeps. */
  SHOULD_STOP_BEFORE_NACH: ['mandates', 'should-stop-before-nach'] as const,
  USER_CONTACT_DETAILS: ['user', 'contact-details'] as const,
  SALARY_ACCOUNTS: ['user', 'salary-accounts'] as const,
};


export const EXCLUDED_PATHS_HEADER = [
  '/account',
  '/my-profile',
  '/loan-agreement',
  '/privacy-policy',
  '/privacy-info',
  '/lending-partners',
  '/support',
  '/need-help',
  '/permissions',
  '/support',
  '/user-permissions',
];

export const CONSENT_MESSAGE = {
  FAMILY_DETAILS: 'We never store your family details. Your data is safe and encrypted.',
  DIGILOCKER: 'We never store your Aadhaar number. Your data is safe and encrypted.',
  REFERENCE_DETAILS: 'We never store your reference details. Your data is safe and encrypted.',
};


export const enum NATIVE_APP_MESSAGE_TYPES {
  DIGILOCKER_SUCCESS = 'DIGILOCKER_SUCCESS',
  FACE_KYC_SUCCESS = 'FACE_KYC_SUCCESS',
  BANK_STATEMENT_SUCCESS = 'BANK_STATEMENT_SUCCESS',
  ESIGN_SUCCESS = 'ESIGN_SUCCESS',
  ENACH_SUCCESS = 'ENACH_SUCCESS',
}

export const VERIFY_PAYMENT_MESSAGE = {
  TITLE: 'Payment is processing',
  MESSAGE: 'This can take up to 5 minutes. Please don\'t refresh or close the app',
};


export const LANGUAGE_OPTIONS: OnboardingLanguageOption[] = [
  {
    code: 'en',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    label: `English / \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940`,
  },
  {
    code: 'hi',
    flag: '\uD83C\uDDEE\uD83C\uDDF3',
    label: `Hindi / ${LANGUAGE_LABELS.hi}`,
  },
];
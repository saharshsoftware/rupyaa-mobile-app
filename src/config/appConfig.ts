import Constants from "expo-constants";
import { Platform } from "react-native";
import { STRING_DATA } from "../constants/data";
import { envConfig } from "./envConfig";

export const appConfig = {
  // Show the marketing onboarding carousel after language selection.
  enableOnboarding: true,
  // Set to true to skip fetching user stage on each loan-journey step (testing only)
  bypassUserStageCheck: true,
  // Toggle to test ProgressStepperV2 (react-native-step-indicator) vs V1
  useProgressStepperV2: true,
  // Temporary local testing flag: keep freeRASP off in dev unless explicitly enabled.
  enableFreeRaspInDev: false,
  byPassSmsPermission: false,
  // Feature flag placeholder for future notification permission gate in loan journey.
  enableNotificationPermissionGate: false,
  useMockApi: false,
  apiDisabled: false,
  useNgrokApiBaseUrl: false,
  useAmanNgrokApiBaseUrl: false,
  stagingApiOverride: 'none' as 'none' | 'staging2' | 'staging',
  useBankStatementUploader: false,
  prefillPersonalWithPiyushData: envConfig.isDevelopment,
  /**
   * Until GET /user/salary-accounts is live: use local fixture (no network).
   * Set to false when the backend endpoint is ready.
   */
  // useSalaryAccountsFixture: envConfig.isDevelopment,
  useSalaryAccountsFixture: false,
  /** Dev fixture scenario: `default` (hint + validation) or `empty` (no salary checks). */
  salaryAccountsFixtureScenario: 'default' as 'default' | 'empty',
  showActiveLoanDashboard: true,
  showActiveLoanDevToolbar: false,
  /** When true, show Contacts menu in Account screen. Overridden by /external/config showGoogleContacts. */
  showGoogleContacts: envConfig.isDevelopment,

  // Toggle startup-related backend calls (app update check, etc.). Push token registration is not gated by this.
  enableStartupApis: true,

  /** How often /app-update is re-checked while the app is foregrounded. */
  appUpdateCheckIntervalMs: 2 * 60 * 1000,

  placeholderAccessToken: 'dev-placeholder-access-token',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  platform: Platform.OS,
  appName: STRING_DATA.APP_NAME,
  hyperKycWorkflowId: 'selfie',
  hyperKycSdkVersion: '10.3.0',
  credeauServerUrl: 'https://devicesync.credeau.com/api',
  credeauClientName: 'we_credit',
  credeauClientKey: 'f4f34638-d6f0-45c3-aee6-166d6b02dca8',
  backgroundSyncIntervalSeconds: 10,
  /** Credeau Android inbox SMS cap per sync; overridden by /external/app-config maxSmsToSync. */
  maxSmsToSync: 200,
  /** Cashfree gateway environment when app-config not loaded. Overridden by /external/app-config. */
  cashfreEnvironment: 'SANDBOX' as const,
  /** Cashfree E-NACH gateway environment when app-config not loaded. Overridden by /external/app-config cashFreeEnachEnvironment. */
  cashFreeEnachEnvironment: 'SANDBOX' as const,
  
  // Contact us
  contactUsWhatsAppNumber: '+91',
  /** Direct WhatsApp chat (wa.me) — prefer this over building from the number. */
  whatsappSupportUrl: 'https://wa.me/918503090309?text=Hi',

  grievanceOfficerEmail: "help@rupyaa.com",
  contactSupportTeamEmail: "care@rupyaa.com",


 /**
   * SSL pinning fallback used only when /external/config is unavailable.
   * The shared `MtJl…` hash is valid for both prod and staging API hosts, so a
   * single fallback set works for either. (Staging-only hash isn't included —
   * only relevant if the config fetch fails on staging.)
   */
 sslPinning: {
  enabled: true,
  includeSubdomains: true,
  publicKeyHashes: [
    'MtJl1Xvef58yNU5l2BSZXkPz+Vv1TjGecQTf7W4Ix5k=',
    'gk7/DWT1g/Hy6epTqoEUpakPAj5rQl61TJvdxUwkXUo=',
    'q9hmZ4vMB/+zQM5v2nIPBexJMLXXzONMJZOGLKfhbCs=',
  ],
  expirationDate: '2026-11-04',
},


  // App store and play store urls
  // TODO (iOS): Replace with the real App Store app ID once the app is registered on App Store Connect.
  // Find it at: App Store Connect → My Apps → [App Name] → App Information → Apple ID
  appStoreUrl: 'https://apps.apple.com/in/app/zapcash/id6666666666',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rupyaa.loan',

  // Policy / legal (open in in-app webview)
  privacyPolicyUrl: 'https://www.rupyaa.com/privacy-policy?source=mobile',
  termsUrl: 'https://www.rupyaa.com/terms?source=mobile',
  faqUrl: 'https://www.rupyaa.com/faq?source=mobile',
  supportUrl: 'https://www.rupyaa.com/support?source=mobile',
  lendingPartnersUrl: 'https://www.rupyaa.com/lenders?source=mobile',
  grievanceRedressalMechanismUrl: 'https://www.rupyaa.com/grievance-redressal-mechanism?source=mobile',
  grievanceRedressalPolicyUrl: 'https://www.rupyaa.com/grievance-redressal-policy?source=mobile',
  // Bank connect: true = show manual PDF uploader first; false = normal AA WebView flow

  // Google Auth
  // webClientId (used for Android server auth code flow and token verification)
  googleClientIdRupyaa: '520032386050-20d39sd8ie54oimi6aejo15oat47967e.apps.googleusercontent.com',
  // Android OAuth 2.0 client ID (type: Android) from Google Cloud Console
  androidGoogleClientIdRupyaa: '520032386050-c25gdrekpmds3ekim8dupqo4fe9e8mnh.apps.googleusercontent.com',
  // iOS OAuth 2.0 client ID (type: iOS) from Google Cloud Console.
  // Create at: console.cloud.google.com → APIs & Services → Credentials → + Cr
  iosGoogleClientId: '520032386050-ksc98gssjndoifj6vmu70j5fcijiv7n1.apps.googleusercontent.com',
};

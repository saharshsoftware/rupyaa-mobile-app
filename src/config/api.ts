import { appConfig } from './appConfig';
import { getCurrentApiBaseUrl } from '@/src/services/devToggles/apiBaseUrlResolver';

export { apiHeaders } from './apiHeaders';

/**
 * API Configuration
 * 
 * useMockApi: Set to true to use mock API responses instead of real backend calls.
 *             Useful for development, testing, or when backend is unavailable.
 *             When true, requests will use mock data from mockApi.ts
 * 
 * mockSkipPaths: Array of API paths that should always use real API, even when useMockApi is true.
 *                Useful for endpoints like auth/otp that need real backend interaction.
 */
/** Extended timeout for file uploads (e.g. bank statement PDF). */
export const BANK_STATEMENT_UPLOAD_TIMEOUT_MS = 60000; // 60 seconds

/** Static partner key for the Gromo/WeCredit Equifax pull route (sent as `api-key` header). */
export const GROMO_EQUIFAX_API_KEY =
  process.env.EXPO_PUBLIC_GROMO_API_KEY ?? 'zapcash-wecredit-api-key';

export const apiConfig = {
  baseUrl: getCurrentApiBaseUrl(),
  timeoutMs: 15000,
  useMockApi: appConfig.useMockApi,
  apiDisabled: appConfig.apiDisabled,
  placeholderAccessToken: appConfig.placeholderAccessToken,
  appVersion: appConfig.appVersion,
};

export const API_ENDPOINTS = {
  auth: {
    checkOtpSignupLogin: '/auth/sessions',
    importGoogleContacts: '/auth/contacts/google',
    refreshToken: '/auth/tokens/refresh',
    logout: '/auth/sessions/logout',
  },
  otp: {
    generate: '/otp',
    verify: '/otp/verify',
  },
  app: {
    placeholderStartup: '/app/startup',
    updateCheck: '/app-update',
    logs: '/app/logs',
  },
  external: {
    jsonPlaceholderUsers: 'https://jsonplaceholder.typicode.com/users',

    // HyperKYC endpoints
    getHyperKycAccessToken: '/external/hyperkyc/token',
    getHyperKycApiResults: '/external/hyperkyc/results',

    // Digilocker endpoints
    getAdhaarImage: '/external/digilocker/aadhar-image',
    digilockerInitiate: '/external/digilocker/sessions',
    digilockerStatus: '/external/digilocker/status',
    emailVerify: '/external/email/verifications',
    emailCheckOtp: '/external/email/otp-verify',
    externalAppConfig: '/external/config',
    encryptionStatus: '/external/encryption',
    gromoEquifaxPull: '/gromo/equifax-pull',
  },
  user: {

    // Personal details && employment details endpoints
    personalDetailsV2: '/user/personal-details',
    getPersonalDetails: '/user/personal-details',
    getGoogleContacts: '/user/google-contacts',
    postEmploymentType: '/user/employment-type',
    postEmploymentDetails: '/user/employment-details',
    getEmploymentDetails: '/user/employment-details',

    // Experian endpoints
    getUserEligibilityExperian: '/user/eligibility/experian',

    // Bank Connect endpoints
    getTempUrl: '/user/bank-statement/consent-url',
    getUserBankStatementStatus: '/user/bank-statement/status',
    uploadBankStatement: '/user/bank-statement',

    // After bank connect endpoints
    getSalaryAccounts: '/user/salary-accounts',
    postBankDetails: '/user/bank-details',
    postReferenceDetails: '/user/references',
    postContactDetails: '/user/contacts',
    getContactDetails: '/user/contacts',
    verifyOfficeEmail: '/user/office-email/verification',
    verifyPersonalEmail: '/user/personal-email/verification',
    postResidenceAddress: '/user/address/residence',
    postFamilyDetails: '/user/family-details',

    // User stage endpoints
    getUserStage: '/user/stage',
    saveUserSms: '/user/save-user-sms',
    saveAppInfo: '/user/save-app-info',

    // Document requests (upload: POST /document-requests/:requestId/attachments)
    getDocumentRequests: '/document-requests',
    uploadDocumentRequest: '/document-requests',

    // FCM token endpoints
    setFcmToken: '/user/set-fcm-token',

    requestNoc: '/user/noc-request',
  },
  loans: {
    getLoanId: '/loans/id',
    applyLoan: '/loans/applications',
    generateAgreementAutomatic: '/loans/:id/agreement',
    getAllUserLoans: '/loans',
    getExistingActiveLoan: '/loans/active',
    cancelEligibility: '/loans/:loanId/cancel-eligibility',
    cancelLoan: '/loans/:loanId/cancel',
  },
  offer: {
    currentOffer: '/offer/current',
    acceptOffer: '/offer/acceptance',
  },
  mandates: {
    createMandate: '/mandates',
    getMandateDetails: '/mandates/user',
    shouldStopBeforeNach: '/mandates/should-stop-before-nach',
  },
  sanction: {
    initiateDoqfy: '/sanction/doqfy/sessions',
    esignStatus: '/sanction/esign/status',
  },
  disburse: {
    initiate: '/disburse/disbursals',
  },
  payment: {
    createOrder: '/payment/orders',
    createPaymentOrder: '/payment/transactions',
    orderStatus: '/payment/order-status',
  },
  tickets: {
    filterOptions: '/tickets/config/filter-options',
    createCustomerTicket: '/tickets/customer',
  },
};

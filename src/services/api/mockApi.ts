import type { ApiResponse } from '@/src/types/api';
import type { LogBatchPayload } from '@/src/types/logging';
import { DEFAULT_SALARY_ACCOUNTS_FIXTURE } from '@/src/data/salaryAccountsFixture';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type MockRequest = {
  method: ApiMethod;
  path: string;
  body?: unknown;
};

const buildSuccess = <T>(data: T, message = 'ok'): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

const buildError = (message: string, code = 'MOCK_ERROR'): ApiResponse<never> => ({
  success: false,
  error: {
    message,
    code,
  },
});

const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

/**
 * Set to true to simulate API errors for registration steps (personal + employment).
 * Use this to test inline error UI and retry flow. Set back to false when done.
 */
const MOCK_REGISTRATION_ERRORS = false;

type MockHandler = {
  matches: (method: ApiMethod, path: string) => boolean;
  handler: (request: MockRequest) => ApiResponse<unknown>;
};

const handlers: MockHandler[] = [
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/otp/generate-otp',
    handler: () =>
      buildSuccess({
        requestId: 'mock_request_123',
        message: 'OTP sent successfully',
        expiresIn: 300,
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/otp/verify',
    handler: () =>
      buildSuccess({
        verified: true,
        message: 'OTP verified successfully',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/auth/check-otp-signup-login',
    handler: () =>
      buildSuccess({
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        userId: 'user_123',
        isNewUser: false,
        status: 'verified',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/app/placeholder-startup',
    handler: () =>
      buildSuccess({
        ok: true,
        timestamp: new Date().toISOString(),
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/external/digilockerInitiate',
    handler: () =>
      buildSuccess({
        verification_id: `verification_undefined_${Date.now()}`,
        reference_id: 8524968,
        url: 'https://digilocker-sdk.notbot.in/?gateway=sandbox&type=digilocker&token=.eJyrVkrOyUzNK4nPTFGyUkrJTM_MyU_OTi2KD_LxCMvNLQ9PKgzPqQoKDU70d_FQ0lFKTyxJLU-sBKotTsxLScqvAIqVVBakomhWqgUAU8IeqA.aYwjHg.KgmwFx2zeiyBcn6okq_pdhLAaqI&auth_type=web',
        status: 'PENDING',
        document_requested: ['AADHAAR'],
        user_flow: 'signup',
        redirect_url: 'https://www.rupyaa.com/dashboard/loan-application/aadhaar-verification',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/external/get-adhaar-image',
    handler: () =>
      buildSuccess({
        success: true,
        imageLink:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5dPwAAAABJRU5ErkJggg==',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/external/digilockerStatus',
    handler: () =>
      buildSuccess({
        message: 'Status checked successfully',
        status: true,
        isAuthenticated: true,
        isAadhaarLinkedNumberVerified: false,
        shouldProceedWithFetch: true,
        bypassReason: '',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-personal-details-v2',
    handler: () =>
      MOCK_REGISTRATION_ERRORS
        ? buildError('PAN already linked to another account.', 'VALIDATION_ERROR')
        : buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/personal-details',
    handler: () =>
      buildSuccess({
        firstName: 'Ravi',
        lastName: 'Sharma',
        phoneNumber: '9876543210',
        dob: '1991-04-12',
        gender: 'male',
        pan: 'ABCDE1234F',
        pincode: '560001',
        salary: 45000,
        /** Sample watermark for Credeau SMS incremental sync (mock). */
        lastSmsSyncedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-employment-type',
    handler: () =>
      MOCK_REGISTRATION_ERRORS
        ? buildError('Unable to save employment type. Please try again.', 'EMPLOYMENT_TYPE_FAILED')
        : buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-employment-details',
    handler: () =>
      MOCK_REGISTRATION_ERRORS
        ? buildError('Unable to verify employment. Please try again.', 'EMPLOYMENT_VERIFY_FAILED')
        : buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-contact-details',
    handler: () => buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/get-contact-details',
    handler: () =>
      buildSuccess({
        message: 'Contact details retrieved successfully',
        contactDetails: {
          email: 'user@example.com',
          alternate_mobile: '9876543210',
        },
        contactFieldOptions: {
          personalEmail: { show: true, verify: false },
          officeEmail: { show: true, verify: true },
          alternateMobile: { show: true, required: false },
        },
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/verify-office-email',
    handler: () => buildSuccess({ message: 'Verification email sent' }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/verify-personal-email',
    handler: () => buildSuccess({ message: 'Verification email sent' }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-residence-address',
    handler: () => buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/get-employment-details',
    handler: () =>
      buildSuccess({
        employmentMode: 'Salaried',
        companyName: 'Acme Corp',
        designation: 'Software Engineer',
        monthlySalary: 48000,
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/get-user-stage',
    handler: () =>
      buildSuccess({
        stage: 'PERSONAL_DETAILS',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/get-user-eligibility-experian',
    handler: () =>
      buildSuccess({
        success: true,
        status: 'SUCCESS',
        salary: 40000,
        decile: 10,
        empType: 'self-employed',
        isReloan: false,
        smsBureauLoanCreated: false,
        message: 'User eligible for loan.',
        isAppRedirected: false,
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/crif-softpull-1',
    handler: () => buildSuccess({ status: 'started' }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/crif-softpull-2',
    handler: () => buildSuccess({ status: 'completed', score: 742 }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/getTempUrl',
    handler: () =>
      buildSuccess({
        url: 'https://example.com/upload',
        expiresIn: 900,
      }),
  },
  {
    matches: (method, path) => {
      if (method !== 'GET') return false;
      const normalizedPath = normalizePath(path);
      return (
        normalizedPath.startsWith('/user/get-bank-statement-status') ||
        normalizedPath.startsWith('/user/getUserBankStatementStatus')
      );
    },
    handler: () =>
      buildSuccess({
        bankStatementStatus: 'Processed',
        callApplyLoan: false,
        bankStatementKey: {},
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/progress-before-offer',
    handler: () =>
      buildSuccess({
        completedSteps: 3,
        totalSteps: 5,
        status: 'in_progress',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/loans/new-loan-application',
    handler: () =>
      buildSuccess({
        loanId: 'loan_123',
        status: 'submitted',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/loans/get-loan-id',
    handler: () =>
      buildSuccess({
        success: true,
        loanId: '6991904177ec40fde454c2ea',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/offer/all',
    handler: () =>
      buildSuccess([
        { offerId: 'offer_1', amount: 50000, tenure: 12, interestRate: 12.5 },
        { offerId: 'offer_2', amount: 75000, tenure: 18, interestRate: 13.2 },
      ]),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/offer/current-offer',
    handler: () =>
      buildSuccess({
        message: 'Successfully fetched current offer',
        offer: {
          _id: 'mock-offer-id',
          offerAmount: 10000,
          loanTenure: 21,
          interestRate: 1,
          payableAmount: 12100,
          status: 'OFFERED',
          isActive: true,
        },
        isRiskyCustomer: false,
        riskyReloanCount: 0,
        showUpdateButton: true,
      }),
  },
  {
    matches: (method, path) =>
      method === 'PUT' && normalizePath(path).startsWith('/offer/'),
    handler: (request) => {
      const offerId = normalizePath(request.path).split('/').pop() ?? 'offer_1';
      return buildSuccess({ offerId, status: 'accepted' });
    },
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/user/salary-accounts',
    handler: () => buildSuccess(DEFAULT_SALARY_ACCOUNTS_FIXTURE),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-bank-details',
    handler: () => buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-reference-details',
    handler: () => buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/user/post-contact-details',
    handler: () => buildSuccess({ saved: true }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/mandates/create-mandate',
    handler: () =>
      buildSuccess({
        subscriptionId: 'Sub_mock_mandate_123',
        sessionId: 'sub_session_mock_mandate_123',
        message: 'Mandate created successfully',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/mandates/getmandatedetails',
    handler: () => ({
      success: true,
      data: {
        message: 'eNACH subscription details retrieved successfully',
        data: {
          id: '69999c2e71fc55d50bc45b19',
          registrationDetails: { status: null, amount: 1, transactionTime: null },
          mandateDetails: {
            bankCode: 'ICIC',
            bankName: 'ICICI BANK LTD',
            mandateStatus: 'INITIALIZED',
            mandateFirstDate: null,
            mandateExpiryDate: '2028-04-02T11:51:10.000Z',
            mandateId: 'Sub_mock_mandate_123',
            cf_subscriptionid: '2298743',
            mandateAmount: 0,
            mandateMaxAmount: 35700,
            mandateCycle: null,
          },
        },
      },
    }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path) === '/mandates/should-stop-before-nach',
    handler: () =>
      buildSuccess({
        shouldStop: false,
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/sanction/initiate-sanction-doqfy',
    handler: () =>
      buildSuccess({
        status: 'initiated',
        requestId: 'sanction_123',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/disburse/initiate',
    handler: () =>
      buildSuccess({
        status: 'queued',
        disbursementId: 'disburse_123',
      }),
  },
  {
    matches: (method, path) =>
      method === 'GET' && normalizePath(path).startsWith('/loans/get-payable-today-payday/'),
    handler: (request) => {
      const loanId = normalizePath(request.path).split('/').pop() ?? 'loan_123';
      return buildSuccess({ loanId, amount: 1200 });
    },
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/payment/create-order',
    handler: () =>
      buildSuccess({
        orderId: 'order_123',
        status: 'created',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/payment/create-payment-order',
    handler: () =>
      buildSuccess({
        order_id: 'order_payment_123',
        payment_session_id: 'session_payment_123',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/collections/mark-as-paid',
    handler: () =>
      buildSuccess({
        status: 'marked',
        receiptId: 'receipt_123',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/auth/refresh-token',
    handler: () =>
      buildSuccess({
        accessToken: 'mock_access_token_' + Date.now(),
        refreshToken: 'mock_refresh_token_' + Date.now(),
        expiresIn: 3600,
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/auth/logout',
    handler: () =>
      buildSuccess({
        success: true,
        message: 'Logged out successfully',
      }),
  },
  {
    matches: (method, path) =>
      method === 'POST' && normalizePath(path) === '/app/logs',
    handler: (request) => {
      const body = request.body as LogBatchPayload | undefined;
      const count = Array.isArray(body?.logs) ? body.logs.length : 0;
      return buildSuccess({
        success: true,
        message: `Accepted ${count} log lines`,
        sessionId: body?.sessionId,
      });
    },
  },
];

export const canMockRequest = (method: ApiMethod, path: string) =>
  handlers.some((handler) => handler.matches(method, path));

export const mockApiRequest = async <T>(request: MockRequest): Promise<ApiResponse<T>> => {
  const handler = handlers.find((entry) => entry.matches(request.method, request.path));
  if (!handler) {
    return buildError(`No mock handler for ${request.method} ${request.path}`, 'MOCK_NOT_FOUND') as ApiResponse<T>;
  }
  return handler.handler(request) as ApiResponse<T>;
};

import { apiClient } from '@/src/services/api/apiClient';
import { API_ENDPOINTS } from '@/src/config/api';
import type { ApiResponse } from '@/src/types/api';
import { isApiResponse } from '@/src/types/api';
import { getRejectionMessage, convertDdMmYyyyToIso } from '@/src/utils/common-helper';
import type {
  PersonalDetails,
  PostPersonalDetailsRequest,
  PostEmploymentDetailsRequest,
  EmploymentType,
  EmploymentDetails,
  GetPersonalDetailsResponse,
  GetEmploymentDetailsResponse,
  PersonalDetailsEmploymentFormDefaults,
} from '@/src/types/registration';
import type {
  PostContactDetailsRequest,
  PostResidenceAddressRequest,
  PostFamilyDetailsRequest,
  PostReferenceDetailsRequest,
  PostBankDetailsRequest,
  SalaryAccountsResponse,
} from '@/src/types/kyc';
import { mapSalaryAccountsResponse } from '@/src/utils/mapSalaryAccountsResponse';
import { appConfig } from '@/src/config/appConfig';
import { getSalaryAccountsFixtureForScenario } from '@/src/data/salaryAccountsFixture';
import type { GetGoogleContactsResponse } from '@/src/types/contacts';

const GENERIC_API_ERROR: ApiResponse<never> = {
  success: false,
  error: {
    message: 'Something went wrong. Please try again.',
    code: 'UNKNOWN_ERROR',
  },
};

export const REJECTION_ERROR_CODE = 'ELIGIBILITY_REJECTED';

// ---------------------
// Mapper: Form data -> API DTO
// ---------------------

/**
 * Convert form PersonalDetails to the API request shape.
 * - dob is stored as dd/mm/yyyy in form, needs yyyy-mm-dd for API.
 * - salary is stored as string in form, needs number for API.
 */
export function mapPersonalDetailsToApi(form: PersonalDetails): PostPersonalDetailsRequest {
  const name = form.name?.trim?.() ?? '';
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    firstName,
    lastName,
    dob: convertDobToApiFormat(form.dob),
    gender: form.gender,
    pan: form.pan.toUpperCase().replace(/\s/g, ''),
    pincode: form.pincode.trim(),
    salary: parseNumericString(form.salary),
    purposeOfLoan: form.purposeOfLoan?.trim() || undefined,
  };
}

/**
 * Map employment type + sub-form data to the flat API request shape.
 * Each sub-form variant is normalized to { employmentMode, companyName, designation, monthlySalary }.
 */
/** Map employment type to API request shape */
export function mapEmploymentTypeToApi(type: EmploymentType): PostEmploymentTypeRequest {
  return { employmentMode: formatEmploymentTypeForApi(type) };
}

export function mapEmploymentDetailsToApi(
  employmentMode: EmploymentType,
  details: EmploymentDetails
): PostEmploymentDetailsRequest {
  const typeLabel = formatEmploymentTypeForApi(employmentMode);
  if ('companyName' in details) {
    // Salaried
    return {
      employmentMode: typeLabel,
      organization: details.companyName.trim(),
      // designation: details.designation.trim(),
      // monthlySalary: parseNumericString(details.netMonthlyIncome),
      declaredSalaryDay: details.declaredSalaryDay,
    };
  }
  if ('businessName' in details) {
    // Self-employed: businessName maps to companyName
    return {
      employmentMode: typeLabel,
      // organization: details.businessName.trim(),
      // designation: details.designation.trim(),
      // monthlySalary: parseNumericString(details.netMonthlyIncome),
      declaredSalaryDay: details.declaredSalaryDay,
    };
  }
  // Unemployed
  return {
    employmentMode: typeLabel,
    // organization: '',
    // designation: details.currentActivity.trim(),
    // monthlySalary: parseNumericString(details.netMonthlyIncome),
    // declaredSalaryDay: details.declaredSalaryDay,
  };
}

/**
 * Convert API personal details to form shape.
 * - dob is returned as yyyy-mm-dd, needs dd/mm/yyyy for the form.
 * - salary is returned as number, needs string for the form.
 */
/**
 * Map employment fields from GET /user/personal-details into persisted details shape.
 */
export function mapEmploymentDetailsFromPersonalDetailsApi(
  data: GetPersonalDetailsResponse
): { employmentMode: EmploymentType; details: EmploymentDetails } | null {
  const employmentMode = parseEmploymentTypeFromApi(data.employmentMode);
  if (!employmentMode) {
    return null;
  }
  const organization = (data.organization ?? '').trim();
  const designation = (data.designation ?? '').trim();
  const declaredSalaryDay = normalizeSalaryDay(data.declaredSalaryDay);
  if (employmentMode === 'salaried') {
    return {
      employmentMode,
      details: {
        companyName: organization,
        designation,
        netMonthlyIncome: '',
        declaredSalaryDay,
      },
    };
  }
  if (employmentMode === 'self_employed') {
    return {
      employmentMode,
      details: {
        businessName: organization,
        designation,
        netMonthlyIncome: '',
        declaredSalaryDay,
      },
    };
  }
  return {
    employmentMode,
    details: {
      currentActivity: designation,
      netMonthlyIncome: '',
      declaredSalaryDay,
    },
  };
}

/**
 * Map employment fields from GET /user/personal-details into merged-form defaults.
 */
export function mapEmploymentDefaultsFromPersonalDetailsApi(
  data: GetPersonalDetailsResponse
): PersonalDetailsEmploymentFormDefaults {
  const mapped = mapEmploymentDetailsFromPersonalDetailsApi(data);
  if (!mapped) {
    return {};
  }
  const { employmentMode, details } = mapped;
  const defaults: PersonalDetailsEmploymentFormDefaults = {
    employmentMode,
    declaredSalaryDay: details.declaredSalaryDay,
  };
  if (employmentMode === 'salaried' && 'companyName' in details && details.companyName) {
    defaults.primaryField = details.companyName;
  }
  if (employmentMode === 'self_employed' && 'businessName' in details && details.businessName) {
    defaults.primaryField = details.businessName;
  }
  return defaults;
}

export function mapPersonalDetailsFromApi(
  data: GetPersonalDetailsResponse
): PersonalDetails {
  const firstName = (data.firstName ?? '').trim();
  const lastName = (data.lastName ?? '').trim();
  const name = `${firstName} ${lastName}`.trim();
  const dob = convertDobFromApiFormat(data.dob ?? '');
  return {
    name,
    dob,
    gender: normalizeGender(data.gender),
    pan: (data.pan ?? '').toUpperCase().replace(/\s/g, ''),
    pincode: (data.pincode ?? '').trim(),
    salary: formatNumericString(data.salary),
    purposeOfLoan: data.purposeOfLoan?.trim() ?? '',
  };
}

/**
 * Convert API employment details to form shape.
 * Returns both the parsed employmentMode and the appropriate details object.
 */
export function mapEmploymentDetailsFromApi(
  data: GetEmploymentDetailsResponse
): { employmentMode: EmploymentType | null; details: EmploymentDetails | null } {
  const employmentMode = parseEmploymentTypeFromApi(data.employmentMode);
  if (!employmentMode) {
    return { employmentMode: null, details: null };
  }

  const monthlyIncome = formatNumericString(data.monthlySalary);
  const companyName = (data.companyName ?? '').trim();
  const designation = (data.designation ?? '').trim();
  const declaredSalaryDay = data.declaredSalaryDay ?? 1;

  if (employmentMode === 'salaried') {
    return {
      employmentMode,
      details: {
        companyName,
        designation,
        netMonthlyIncome: monthlyIncome,
        declaredSalaryDay,
      },
    };
  }

  if (employmentMode === 'self_employed') {
    return {
      employmentMode,
      details: {
        businessName: companyName,
        designation,
        netMonthlyIncome: monthlyIncome,
        declaredSalaryDay,
      },
    };
  }

  return {
    employmentMode,
    details: {
      currentActivity: designation,
      netMonthlyIncome: monthlyIncome,
      declaredSalaryDay,
    },
  };
}

// ---------------------
// API Calls
// ---------------------

/**
 * Submit personal details to backend (POST /user/post-personal-details-v2).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postPersonalDetails(
  data: PostPersonalDetailsRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post<unknown>(
      API_ENDPOINTS.user.personalDetailsV2,
      data
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    // if (response.success) {
    //   const record = response.data as Record<string, unknown> | null | undefined;
    //   const isEligible = record?.isEligible;
    //   if (isEligible === false) {
    //     const rejectionMessage =
    //       getRejectionMessage(response.data) || 'You are not eligible to proceed.';
    //     return {
    //       success: false,
    //       error: {
    //         message: rejectionMessage,
    //         code: REJECTION_ERROR_CODE,
    //         details: response.data,
    //       },
    //       status: response.status,
    //     };
    //   }
    //   if (isEligible !== true) {
    //     const rejectionMessage = getRejectionMessage(response.data);
    //     if (rejectionMessage) {
    //       return {
    //         success: false,
    //         error: {
    //           message: rejectionMessage,
    //           code: REJECTION_ERROR_CODE,
    //           details: response.data,
    //         },
    //         status: response.status,
    //       };
    //     }
    //   }
    // }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Fetch personal details from backend (GET /user/get-personal-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function getPersonalDetails(): Promise<ApiResponse<GetPersonalDetailsResponse>> {
  try {
    const response = await apiClient.get<GetPersonalDetailsResponse>(
      API_ENDPOINTS.user.getPersonalDetails
    );
    return response as ApiResponse<GetPersonalDetailsResponse>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Fetch Google contacts from backend (GET /user/google-contacts).
 * Requires user to have completed Google OAuth. Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function getGoogleContacts(): Promise<
  ApiResponse<GetGoogleContactsResponse>
> {
  try {
    const response = await apiClient.get<GetGoogleContactsResponse>(
      API_ENDPOINTS.user.getGoogleContacts
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response as ApiResponse<GetGoogleContactsResponse>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/** Request body for POST /user/post-employment-type */
export interface PostEmploymentTypeRequest {
  employmentMode: string;
}

/** Format employment type enum to API label (e.g. 'salaried' -> 'Salaried') */
function formatEmploymentTypeForApi(type: EmploymentType): string {
  const labels: Record<EmploymentType, string> = {
    salaried: 'salaried',
    self_employed: 'self-employed',
    unemployed: 'unemployed',
  };
  return labels[type] ?? type;
}

/**
 * Submit employment type to backend (POST /user/post-employment-type).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postEmploymentType(
  data: PostEmploymentTypeRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postEmploymentType,
      data
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Submit employment details to backend (POST /user/post-employment-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postEmploymentDetails(
  data: PostEmploymentDetailsRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postEmploymentDetails,
      {...data, employmentMode: formatEmploymentTypeForApi(data.employmentMode as EmploymentType)}
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Submit contact details to backend (POST /user/post-contact-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postContactDetails(
  data: PostContactDetailsRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postContactDetails,
      data
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Submit residence address to backend (POST /user/post-residence-address).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postResidenceAddress(
  data: PostResidenceAddressRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postResidenceAddress,
      data
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Submit family details to backend (POST /user/post-family-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postFamilyDetails(
  data: PostFamilyDetailsRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postFamilyDetails,
      data
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Submit reference details to backend (POST /user/post-reference-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postReferenceDetails(
  data: PostReferenceDetailsRequest
): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postReferenceDetails,
      data
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Fetch salary account hints from backend (GET /user/salary-accounts).
 * Uses local fixture when appConfig.useSalaryAccountsFixture is true (API not ready).
 * On live API failure returns empty salaryAccounts so hint/validation are skipped.
 */
export async function getSalaryAccounts(): Promise<ApiResponse<SalaryAccountsResponse>> {
  if (appConfig.useSalaryAccountsFixture) {
    return {
      success: true,
      data: getSalaryAccountsFixtureForScenario(
        appConfig.salaryAccountsFixtureScenario
      ),
    };
  }

  try {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.user.getSalaryAccounts);
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    if (!response.success) {
      return response as ApiResponse<SalaryAccountsResponse>;
    }
    return {
      ...response,
      data: mapSalaryAccountsResponse(response.data),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Submit bank details to backend (POST /user/post-bank-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function postBankDetails(
  data: PostBankDetailsRequest
): Promise<ApiResponse<unknown>> {
  const payload: PostBankDetailsRequest = {
    accountHolderName: data.accountHolderName.trim(),
    accountNumber: data.accountNumber.trim(),
    ifscCode: data.ifscCode.trim().toUpperCase(),
    bankName: data.bankName.trim(),
    branchName: data.branchName.trim(),
    accountType: data.accountType,
  };

  try {
    const response = await apiClient.post(
      API_ENDPOINTS.user.postBankDetails,
      payload
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Fetch employment details from backend (GET /user/get-employment-details).
 * Catches all errors and returns a safe ApiResponse; never throws.
 */
export async function getEmploymentDetails(): Promise<ApiResponse<GetEmploymentDetailsResponse>> {
  try {
    const response = await apiClient.get<GetEmploymentDetailsResponse>(
      API_ENDPOINTS.user.getEmploymentDetails
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }
    return response as ApiResponse<GetEmploymentDetailsResponse>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

// ---------------------
// Helpers
// ---------------------

const convertDobToApiFormat = convertDdMmYyyyToIso;

/** Convert yyyy-mm-dd to dd/mm/yyyy for the API */
function convertDobToFormFormat(dob: string): string {
  const parts = dob.split('/');
  if (parts.length !== 3) return dob;
  const [year, month, day] = parts;
  return `${year}-${month}-${day}`;
}

/** Convert yyyy-mm-dd to dd/mm/yyyy for the form */
function convertDobFromApiFormat(dob: string): string {
  if (!dob) return '';
  if (dob.toLowerCase().includes('nan')) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';

  const result = [
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    d.getUTCFullYear(),
  ].join("/");
  return result ?? '';
}

function normalizeSalaryDay(value?: number): number {
  if (value == null || !Number.isFinite(value)) {
    return 1;
  }
  const day = Math.trunc(value);
  if (day < 1 || day > 31) {
    return 1;
  }
  return day;
}

function parseEmploymentTypeFromApi(value?: string): EmploymentType | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'salaried') return 'salaried';
  if (normalized === 'self_employed' || normalized === 'selfemployed') {
    return 'self_employed';
  }
  if (normalized === 'unemployed') return 'unemployed';
  return null;
}

function normalizeGender(value?: string): PersonalDetails['gender'] {
  if (!value) return undefined as unknown as PersonalDetails['gender'];
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('m')) return 'male';
  if (normalized.startsWith('f')) return 'female';
  if (normalized.startsWith('o')) return 'others';
  return undefined as unknown as PersonalDetails['gender'];
}

/** Safely parse a numeric string, falling back to 0 */
function parseNumericString(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Convert numeric API values to form strings */
function formatNumericString(value?: number | string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return value.trim();
}

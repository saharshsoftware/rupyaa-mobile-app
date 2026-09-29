// Employment types
export type EmploymentType = 'salaried' | 'self_employed' | 'unemployed';

// Personal details (form shape; mapped to POST /user/post-personal-details-v2)
export interface PersonalDetails {
  name: string;
  dob: string; // dd/mm/yyyy format (converted for API)
  gender: 'male' | 'female' | 'others';
  pan: string;
  pincode: string;
  purposeOfLoan?: string;
  salary: string; // stored as string in form, converted to number for API
}

// Employment-specific forms (conditional UI, mapped to flat API shape)
export interface SalariedDetails {
  companyName: string;
  designation: string;
  netMonthlyIncome: string;
  declaredSalaryDay: number;
  workEmail?: string;
}

export interface SelfEmployedDetails {
  businessName: string;
  designation: string;
  netMonthlyIncome: string;
  declaredSalaryDay: number;
  businessDomain?: string;
  workEmail?: string;
}

export interface UnemployedDetails {
  currentActivity: string;
  netMonthlyIncome: string;
  declaredSalaryDay: number;
  alternateEmail?: string;
}

// Union type for employment details
export type EmploymentDetails =
  | SalariedDetails
  | SelfEmployedDetails
  | UnemployedDetails;

// Combined registration data
export interface RegistrationData {
  personalDetails: PersonalDetails;
  employmentMode: EmploymentType;
  employmentDetails: EmploymentDetails;
}

// ---------------------
// API Request DTOs
// ---------------------

/** Request body for POST /user/post-personal-details-v2 */
export interface PostPersonalDetailsRequest {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  pan: string;
  pincode: string;
  salary: number;
  purposeOfLoan?: string;
}

/** Request body for POST /user/post-employment-details */
export interface PostEmploymentDetailsRequest {
  employmentMode: string;
  organization?: string;
  designation?: string;
  monthlySalary?: number;
  declaredSalaryDay?: number;
}

/** Response body for GET /user/get-personal-details */
export interface GetPersonalDetailsResponse {
  userId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  pan?: string;
  pincode?: string;
  salary?: number | string;
  purposeOfLoan?: string;
  phoneNumber?: string;
  employmentMode?: string;
  organization?: string;
  designation?: string;
  declaredSalaryDay?: number;
  softPullConsentWithdrawn?: boolean;
  hasNoActiveLoan?: boolean;
  disableFields?: boolean;
  /** Whether the user has completed Google OAuth (e.g. for contacts). */
  isOauthDone?: boolean;
  /** Server watermark for last synced SMS (epoch ms or ISO string from API). */
  lastSmsSyncedAt?: number | string;
  /** Epoch ms of the most recent SMS already stored on server. Use for incremental filtering. */
  latestSmsDate?: number | string;
}


/** Employment section defaults for the merged personal-details form. */
export interface PersonalDetailsEmploymentFormDefaults {
  employmentMode?: EmploymentType;
  primaryField?: string;
  declaredSalaryDay?: number;
}
/** Response body for GET /user/get-employment-details */
export interface GetEmploymentDetailsResponse {
  employmentMode?: string;
  companyName?: string;
  designation?: string;
  monthlySalary?: number | string;
  declaredSalaryDay?: number;
}

import type { GetPersonalDetailsResponse } from '@/src/types/registration';
import { formatEmploymentMode, formatSalary } from '@/src/utils/profile-formatters';

type ProfileRecord = GetPersonalDetailsResponse & Record<string, unknown>;

export interface KeyValueField {
  label: string;
  value: string;
}

export interface DobParts {
  day: string;
  month: string;
  year: string;
}

export type GenderValue = 'male' | 'female' | 'other';

export interface MyProfileViewModel {
  fullName?: string;
  basicFields: KeyValueField[];
  personalFields: KeyValueField[];
  residenceFields: KeyValueField[];
  employmentFields: KeyValueField[];
  dobParts?: DobParts;
  gender?: GenderValue;
  genderLabel?: string;
  hasAnyData: boolean;
}

interface NormalizedProfileData {
  fullName?: string;
  mobileNumber?: string;
  panCardNumber?: string;
  personalEmail?: string;
  dobParts?: DobParts;
  gender?: GenderValue;
  genderLabel?: string;
  addressLine1?: string;
  addressLine2?: string;
  pincode?: string;
  cityState?: string;
  employmentType?: string;
  companyName?: string;
  designation?: string;
  monthlyIncome?: string;
  workEmail?: string;
}

interface FieldConfig {
  label: string;
  resolve: (data: NormalizedProfileData) => string | undefined;
}

const PROFILE_KEY_ALIASES = {
  mobileNumber: ['phoneNumber', 'mobileNumber', 'mobile'],
  panCardNumber: ['pan'],
  personalEmail: ['personalEmail', 'email', 'personal_email'],
  dob: ['dob'],
  gender: ['gender'],
  addressLine1: ['addressLine1', 'address_line_1'],
  addressLine2: ['addressLine2', 'address_line_2'],
  pincode: ['pincode', 'pinCode'],
  city: ['city'],
  state: ['state'],
  employmentMode: ['employmentMode'],
  companyName: ['companyName', 'businessName', 'organization'],
  designation: ['designation'],
  workEmail: ['workEmail', 'officeEmail', 'work_email'],
  monthlyIncome: ['monthlySalary', 'netMonthlyIncome', 'salary'],
} as const;

const BASIC_SECTION_CONFIG: readonly FieldConfig[] = [
  { label: 'Name', resolve: (data) => data.fullName },
  { label: 'Mobile Number', resolve: (data) => data.mobileNumber },
];

const PERSONAL_SECTION_CONFIG: readonly FieldConfig[] = [
  { label: 'PAN Card Number', resolve: (data) => data.panCardNumber },
  { label: 'Personal Email Id', resolve: (data) => data.personalEmail },
];

const RESIDENCE_SECTION_CONFIG: readonly FieldConfig[] = [
  { label: 'Address Line 1', resolve: (data) => data.addressLine1 },
  { label: 'Address Line 2', resolve: (data) => data.addressLine2 },
  { label: 'Pincode', resolve: (data) => data.pincode },
  { label: 'City, State', resolve: (data) => data.cityState },
];

const EMPLOYMENT_SECTION_CONFIG: readonly FieldConfig[] = [
  { label: 'Employment Type', resolve: (data) => data.employmentType },
  { label: 'Company Name', resolve: (data) => data.companyName },
  // { label: 'Designation', resolve: (data) => data.designation },
  { label: 'Net Monthly Income (INR)', resolve: (data) => data.monthlyIncome },
  { label: 'Work Email Address', resolve: (data) => data.workEmail },
];

export const GENDER_OPTIONS: { key: GenderValue; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];

function normalizeText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function pickFirstString(
  source: ProfileRecord | null,
  keys: readonly string[],
): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = normalizeText(source[key]);
    if (value) return value;
  }
  return undefined;
}

function buildName(source: ProfileRecord | null): string | undefined {
  if (!source) return undefined;
  const firstName = normalizeText(source.firstName);
  const middleName = normalizeText(source.middleName);
  const lastName = normalizeText(source.lastName);
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

function parseDobParts(dobRaw?: string): DobParts | undefined {
  if (!dobRaw) return undefined;

  const isoMatch = dobRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: isoMatch[1],
      month: isoMatch[2],
      day: isoMatch[3],
    };
  }

  const dmyMatch = dobRaw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmyMatch) {
    return {
      day: dmyMatch[1],
      month: dmyMatch[2],
      year: dmyMatch[3],
    };
  }

  const parsed = new Date(dobRaw);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    month: String(parsed.getMonth() + 1).padStart(2, '0'),
    year: String(parsed.getFullYear()),
  };
}

function normalizeGender(genderRaw?: string): GenderValue | undefined {
  if (!genderRaw) return undefined;
  const normalized = genderRaw.trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (normalized === 'male') return 'male';
  if (normalized === 'female') return 'female';
  if (normalized === 'other' || normalized === 'others') return 'other';
  return undefined;
}

function toTitleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function createSectionFields(
  configs: readonly FieldConfig[],
  data: NormalizedProfileData,
): KeyValueField[] {
  return configs
    .map((config) => ({
      label: config.label,
      value: config.resolve(data) ?? '',
    }))
    .filter((field) => field.value.length > 0);
}

function normalizeProfileData(profile: ProfileRecord | null): NormalizedProfileData {
  const fullName = buildName(profile);
  const mobileNumber = pickFirstString(profile, PROFILE_KEY_ALIASES.mobileNumber);
  const panCardNumber = pickFirstString(profile, PROFILE_KEY_ALIASES.panCardNumber);
  const personalEmail = pickFirstString(profile, PROFILE_KEY_ALIASES.personalEmail);

  const genderRaw = pickFirstString(profile, PROFILE_KEY_ALIASES.gender);
  const gender = normalizeGender(genderRaw);
  const genderLabel = genderRaw ? toTitleCase(genderRaw) : undefined;
  const dobParts = parseDobParts(pickFirstString(profile, PROFILE_KEY_ALIASES.dob));

  const addressLine1 = pickFirstString(profile, PROFILE_KEY_ALIASES.addressLine1);
  const addressLine2 = pickFirstString(profile, PROFILE_KEY_ALIASES.addressLine2);
  const pincode = pickFirstString(profile, PROFILE_KEY_ALIASES.pincode);
  const city = pickFirstString(profile, PROFILE_KEY_ALIASES.city);
  const state = pickFirstString(profile, PROFILE_KEY_ALIASES.state);
  const cityState = [city, state].filter(Boolean).join(', ') || undefined;

  const employmentTypeRaw = pickFirstString(profile, PROFILE_KEY_ALIASES.employmentMode);
  const employmentType = employmentTypeRaw
    ? formatEmploymentMode(employmentTypeRaw)
    : undefined;
  const companyName = pickFirstString(profile, PROFILE_KEY_ALIASES.companyName);
  const designation = pickFirstString(profile, PROFILE_KEY_ALIASES.designation);
  const workEmail = pickFirstString(profile, PROFILE_KEY_ALIASES.workEmail);
  const monthlyIncomeRaw = pickFirstString(profile, PROFILE_KEY_ALIASES.monthlyIncome);
  const monthlyIncome = monthlyIncomeRaw ? formatSalary(monthlyIncomeRaw) : undefined;

  return {
    fullName,
    mobileNumber,
    panCardNumber,
    personalEmail,
    dobParts,
    gender,
    genderLabel,
    addressLine1,
    addressLine2,
    pincode,
    cityState,
    employmentType,
    companyName,
    designation,
    monthlyIncome,
    workEmail,
  };
}

export function buildMyProfileViewModel(
  personalDetails: GetPersonalDetailsResponse | null | undefined,
): MyProfileViewModel {
  const profile = (personalDetails as ProfileRecord | null) ?? null;
  const normalizedData = normalizeProfileData(profile);

  const basicFields = createSectionFields(BASIC_SECTION_CONFIG, normalizedData);
  const personalFields = createSectionFields(PERSONAL_SECTION_CONFIG, normalizedData);
  const residenceFields = createSectionFields(RESIDENCE_SECTION_CONFIG, normalizedData);
  const employmentFields = createSectionFields(EMPLOYMENT_SECTION_CONFIG, normalizedData);

  const hasAnyData =
    basicFields.length > 0 ||
    personalFields.length > 0 ||
    residenceFields.length > 0 ||
    employmentFields.length > 0 ||
    Boolean(normalizedData.dobParts) ||
    Boolean(normalizedData.genderLabel);

  return {
    fullName: normalizedData.fullName,
    basicFields,
    personalFields,
    residenceFields,
    employmentFields,
    dobParts: normalizedData.dobParts,
    gender: normalizedData.gender,
    genderLabel: normalizedData.genderLabel,
    hasAnyData,
  };
}

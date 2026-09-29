import type { RadioOption } from '@/src/components/RadioGroup';
import type { EmploymentType } from '@/src/types/registration';

export const GENDER_OPTIONS: RadioOption<'male' | 'female' | 'others'>[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'others', label: 'Others' },
];

export const EMPLOYMENT_OPTIONS: RadioOption<EmploymentType>[] = [
  {
    value: 'salaried',
    label: 'Salaried',
    description:
      'You receive a regular salary from an employer.',
  },
  {
    value: 'self_employed',
    label: 'Self-employed / Business Owner / Freelancer',
    description:
      'You earn through business or freelance work.',
  },
  // {
  //   value: 'unemployed',
  //   label: 'Unemployed',
  //   description:
  //     "Choose this if you're between jobs or not receiving regular income right now.",
  // },
];

export const BUSINESS_DOMAIN_OPTIONS = [
  'IT Services',
  'Retail',
  'Content Writing',
  'Design',
  'Consulting',
  'Manufacturing',
  'Healthcare',
  'Education',
  'Finance',
  'Real Estate',
  'Other',
] as const;

export const PURPOSE_OF_LOAN_OPTIONS = [
  'Medical Emergency',
  'Debt Repayment',
  'Rent Payment',
  'Home Expense',
  'Education Expenses',
  'Other Personal Expense',
].map((purpose) => ({ label: purpose, value: purpose }));

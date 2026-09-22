import { z } from 'zod';

// PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const personalDetailsSchema = z.object({
  name: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? ''),
  dob: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use dd/mm/yyyy format'),
  gender: z.enum(['male', 'female', 'others']),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  pan: z
    .string()
    .transform((s) => s?.toUpperCase().replace(/\s/g, '') ?? '')
    .refine((s) => panRegex.test(s), 'Invalid PAN format'),
  salary: z.string().min(1, 'Salary is required'),
  purposeOfLoan: z.string().trim().optional(),
});

export const salariedSchema = z.object({
  companyName: z.string().min(2, 'Organization name is required'),
  declaredSalaryDay: z.number().min(1, 'Select a valid day').max(31, 'Select a valid day'),
  // designation: z.string().min(2, 'Designation is required'),
  // netMonthlyIncome: z.string().min(1, 'Income is required'),
});

export const selfEmployedSchema = z.object({
  businessName: z.string().min(2, 'Organization name is required'),
  declaredSalaryDay: z.number().min(1, 'Select a valid day').max(31, 'Select a valid day'),
  // designation: z.string().min(2, 'Designation is required'),
  // netMonthlyIncome: z.string().min(1, 'Income is required'),
});

export const unemployedSchema = z.object({
  currentActivity: z
    .string()
    .min(2, 'Organization name is required'),
  declaredSalaryDay: z.number().min(1, 'Select a valid day').max(31, 'Select a valid day'),
  // netMonthlyIncome: z.string().min(1, 'Income is required'),
});

/** Unified schema for the single EmploymentDetailsForm (all employment modes). */
export const employmentDetailsFormSchema = z.object({
  primaryField: z.string().min(2, 'Organization name is required'),
  declaredSalaryDay: z.number().min(1, 'Select a valid day').max(31, 'Select a valid day'),
});

/**
 * [single-screen-merge] Personal details + employment type + salaried work fields
 * in one schema for the merged PersonalDetailsStep. Company is required for
 * salaried users; a payment day is required for salaried and self-employed users.
 */
export const personalWithEmploymentSchema = personalDetailsSchema
  .extend({
    employmentMode: z.enum(['salaried', 'self_employed', 'unemployed'], {
      message: 'Select your employment type',
    }),
    primaryField: z.string().optional(),
    declaredSalaryDay: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.employmentMode === 'unemployed') return;
    if (data.employmentMode === 'salaried' && (!data.primaryField || data.primaryField.trim().length < 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['primaryField'],
        message: 'Organization name is required',
      });
    }
    const day = data.declaredSalaryDay;
    if (day == null || !Number.isInteger(day) || day < 1 || day > 31) {
      ctx.addIssue({
        code: 'custom',
        path: ['declaredSalaryDay'],
        message: 'Select a valid day',
      });
    }
  });


export type PersonalDetailsSchema = z.infer<typeof personalDetailsSchema>;
export type SalariedSchema = z.infer<typeof salariedSchema>;
export type SelfEmployedSchema = z.infer<typeof selfEmployedSchema>;
export type UnemployedSchema = z.infer<typeof unemployedSchema>;
export type EmploymentDetailsFormSchema = z.infer<typeof employmentDetailsFormSchema>;
export type PersonalWithEmploymentSchema = z.infer<typeof personalWithEmploymentSchema>;
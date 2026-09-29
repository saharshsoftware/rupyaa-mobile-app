import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useScrollToFirstError } from '@/hooks/useScrollToFirstError';
import type { ScrollViewScrollToFocusedInput } from '@/hooks/useScrollToFirstError';
import { useForm, useWatch } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppText } from '../AppText';
import { ControlledInput, ControlledDateInput, ControlledRadioGroup, ControlledDropdown } from '../ControlledInput';
import { Button } from '../Button';
import { ConfirmationSheet, type ConfirmationField } from '../ConfirmationSheet';
import { FormLayout } from '../FormLayout';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  RegistrationService,
  personalDetailsSchema,
  personalWithEmploymentSchema,
  postPersonalDetails,
  mapPersonalDetailsToApi,
  mapEmploymentDetailsToApi,
  getPersonalDetails,
  mapPersonalDetailsFromApi,
  mapEmploymentDefaultsFromPersonalDetailsApi,
  mapEmploymentDetailsFromPersonalDetailsApi,
  createRegistrationSubmit,
} from '@/src/services/registration';
import { devLog } from '@/src/utils';
import { getApiErrorDisplayMessage, getRejectionMessage } from '@/src/utils/common-helper';
import { GENDER_OPTIONS, EMPLOYMENT_OPTIONS, PURPOSE_OF_LOAN_OPTIONS } from '@/src/data/registration';
import type {
  PersonalDetails,
  PostPersonalDetailsRequest,
  EmploymentType,
  EmploymentDetails,
} from '@/src/types/registration';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useFlowStore } from '@/src/store/useFlowStore';
import ErrorContainer from '../ErrorContainer';
import { appConfig } from '@/src/config/appConfig';
import { REGISTRATION_ERROR_MESSAGES } from '@/src/services/registration/registrationSubmit';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import { ConsentNotice } from '../ConsentNotice';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import { pushLoanJourneyApiError } from '@/src/services/logging/logPoolJourney';
// [single-screen-merge] Reuse the employment step's helpers/nav so the merged
// screen does not duplicate that logic. EmploymentTypeStep/EmploymentDetailsStep
// stay in the repo (out of the flow); EmploymentDetailsStep remains the source of
// truth for these helpers when we revert.
import {
  FORM_CONFIG_BY_MODE,
  MINIMAL_DETAILS_BY_MODE,
  salaryDayOptions,
  handlePostSubmitSuccess,
} from './EmploymentDetailsStep';

type MergedFormData = z.input<typeof personalWithEmploymentSchema>;

// [single-screen-merge] Combined submit input: personal + employment together.
type MergedSubmitInput = {
  personal: PersonalDetails;
  employmentMode: EmploymentType;
  details: EmploymentDetails;
};

// Employment-section fields. When one of these is the first error we scroll to the
// end to reveal the whole section above the footer/keyboard — the generic
// focus-scroll under-scrolls it because it sits under the tall Employment Type card
// near the bottom. Company Name is still focused (it's a text input); the radio and
// dropdown are not focusable.
const EMPLOYMENT_FIELDS: (keyof MergedFormData)[] = ['employmentMode', 'primaryField', 'declaredSalaryDay'];

// Visual field order for scroll/focus-to-first-error. Fields without a focusable
// TextInput ref (gender, employmentMode, declaredSalaryDay) are skipped by the
// hook, but stay listed so the "first error" is picked in on-screen order.
const FIELD_ORDER: (keyof MergedFormData)[] = [
  'pan',
  'pincode',
  'dob',
  'gender',
  'salary',
  'purposeOfLoan',
  'employmentMode',
  'primaryField',
  'declaredSalaryDay',
];

// [single-screen-merge] Single POST /user/personal-details carrying personal +
// employment. Reuses both existing mappers; postEmploymentDetails is no longer
// called. Restore the split submits in EmploymentTypeStep/EmploymentDetailsStep to revert.
const submitMergedDetails = createRegistrationSubmit<MergedSubmitInput, PostPersonalDetailsRequest>({
  useMock: appConfig.useMockApi,
  mockSave: async ({ personal, details }) => {
    await RegistrationService.savePersonalDetails(personal);
    await RegistrationService.saveEmploymentDetails(details);
  },
  mapToPayload: ({ personal, employmentMode, details }) => ({
    ...mapPersonalDetailsToApi(personal),
    ...mapEmploymentDetailsToApi(employmentMode, details),
  }),
  apiCall: postPersonalDetails,
});

const extractRejectReason = (data: unknown): string => getRejectionMessage(data);

const formatGenderLabel = (gender: PersonalDetails['gender'] | undefined): string => {
  if (!gender) return '';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
};

const formatCurrencyINR = (raw: string | undefined): string => {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const numeric = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return value;
  return `₹${numeric.toLocaleString('en-IN')}`;
};

const mapPersonalDetailsToConfirmationFields = (data: PersonalDetails): ConfirmationField[] => [
  { label: 'PAN Number', value: data.pan || '-' },
  { label: 'Pincode', value: data.pincode || '-' },
  { label: 'Date of Birth', value: data.dob || '-' },
  { label: 'Gender', value: formatGenderLabel(data.gender) || '-' },
  { label: 'Monthly Income', value: formatCurrencyINR(data.salary) || '-' },
  { label: 'Purpose of Loan', value: data.purposeOfLoan || '-' },
];

// [single-screen-merge] Extra confirmation rows for employment.
const mapEmploymentToConfirmationFields = (
  employmentMode: EmploymentType,
  details: EmploymentDetails
): ConfirmationField[] => {
  const typeLabel = EMPLOYMENT_OPTIONS.find((o) => o.value === employmentMode)?.label ?? employmentMode;
  const rows: ConfirmationField[] = [{ label: 'Employment Type', value: typeLabel }];
  if ('companyName' in details) {
    rows.push({ label: 'Company Name', value: details.companyName || '-' });
    rows.push({ label: 'Salary Credit Day', value: String(details.declaredSalaryDay) });
  }
  if (employmentMode === 'self_employed') {
    rows.push({ label: 'EMI Date', value: String(details.declaredSalaryDay) });
  }
  return rows;
};

export function PersonalDetailsStep({ onNext, onPrev }: StepProps) {
  // [single-screen-merge] After the merged submit the backend advances to
  // SOFT_PULL, so we reuse the employment step's SOFT_PULL post-submit nav.
  const currentStage: UserStage = UserStagesInBackend.SOFT_PULL;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();
  const [pendingData, setPendingData] = useState<MergedSubmitInput | null>(null);
  const didAttemptConfirmRef = useRef(false);

  // Refs for input fields and scroll view
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const panInputRef = useRef<TextInput>(null);
  const pincodeInputRef = useRef<TextInput>(null);
  const dobInputRef = useRef<TextInput>(null);
  const salaryInputRef = useRef<TextInput>(null);
  const companyInputRef = useRef<TextInput>(null);

  const fieldRefs = useMemo(
    () => ({
      pan: panInputRef,
      pincode: pincodeInputRef,
      dob: dobInputRef,
      salary: salaryInputRef,
      primaryField: companyInputRef,
    }),
    []
  );
  const focusFirstError = useScrollToFirstError<MergedFormData>(
    FIELD_ORDER,
    fieldRefs,
    scrollViewRef as React.RefObject<ScrollViewScrollToFocusedInput | null>
  );

  // If the first error is in the employment section (radio / Company Name / salary
  // day), scroll to the end so the whole section is visible above the footer/keyboard
  // — still focusing Company Name for the cursor. Otherwise defer to the
  // focus-first-error hook (personal fields near the top scroll fine on their own).
  const onValidationError = useCallback(
    (errors: FieldErrors<MergedFormData>) => {
      const firstErrorField = FIELD_ORDER.find((field) => errors[field]);
      if (firstErrorField && EMPLOYMENT_FIELDS.includes(firstErrorField)) {
        if (firstErrorField === 'primaryField') {
          companyInputRef.current?.focus();
        }
        const scroller = scrollViewRef.current as unknown as {
          scrollToEnd?: (options?: { animated?: boolean }) => void;
        };
        // Delay lets the keyboard start opening (when Company Name is focused) so
        // the end position accounts for the reduced viewport.
        setTimeout(() => scroller?.scrollToEnd?.({ animated: true }), 150);
        return;
      }
      focusFirstError(errors);
    },
    [focusFirstError]
  );

  const { submit, isPending, errorMessage, clearError, setErrorMessage } =
    useRegistrationSubmit<MergedSubmitInput>({
      mutationFn: submitMergedDetails,
      onSuccess: () => {
        didAttemptConfirmRef.current = false;
        setPendingData(null);
        // Merged personal + employment screen has its own combined submit event.
        void logAnalyticsEvent(ANALYTICS_EVENT.PERSONAL_EMPLOYMENT_DETAIL_PAGE_SUBMIT);
        // Reuse employment step's post-submit navigation (Credeau + soft-pull).
        void handlePostSubmitSuccess({
          onNext,
          setErrorMessage,
          syncFromUserStage,
          currentStage,
        });
      },
      onFailedResponse: (data) => {
        didAttemptConfirmRef.current = false;
        setPendingData(null);
        return handleFailedResponse(data);
      },
    });

  const { control, handleSubmit, reset, getValues } = useForm<MergedFormData>({
    resolver: zodResolver(personalWithEmploymentSchema),
    defaultValues: {
      name: '',
      dob: appConfig.prefillPersonalWithPiyushData ? '30/11/1985' : '',
      gender: appConfig.prefillPersonalWithPiyushData ? 'male' : undefined,
      pincode: appConfig.prefillPersonalWithPiyushData ? '311404' : '',
      pan: '',
      salary: appConfig.prefillPersonalWithPiyushData ? '51000' : '',
      purposeOfLoan: '',
      employmentMode: undefined,
      primaryField: '',
      declaredSalaryDay: 1,
    },
  });

  // Watch the in-form employment type to toggle the salaried work fields.
  const selectedMode = useWatch({ control, name: 'employmentMode' });
  const isSalaried = selectedMode === 'salaried';
  const isSelfEmployed = selectedMode === 'self_employed';

  useEffect(() => {
    devLog.screenEnter('personal-details');
    const loadSavedData = async () => {
      // Restore a previously-chosen employment type / work details (resume).
      const saved = await RegistrationService.getRegistrationData();
      const savedMode = (saved?.employmentMode as EmploymentType | undefined) ?? undefined;
      const savedDetails = saved?.employmentDetails;
      const localEmploymentDefaults = {
        employmentMode: savedMode,
        primaryField:
          savedMode && savedDetails
            ? FORM_CONFIG_BY_MODE[savedMode].getSavedPrimaryValue(savedDetails)
            : '',
        declaredSalaryDay: savedDetails?.declaredSalaryDay ?? 1,
      };

      const response = await getPersonalDetails();
      if (!response.success) {
        pushLoanJourneyApiError(
          'personal details prefetch',
          response.error,
          response.status
        );
        setErrorMessage(
          getApiErrorDisplayMessage(response.error) || REGISTRATION_ERROR_MESSAGES.generic
        );
        if (savedMode) reset({ ...getValues(), ...localEmploymentDefaults });
        return;
      }

      const mapped = mapPersonalDetailsFromApi(response.data);
      const apiEmploymentDefaults = mapEmploymentDefaultsFromPersonalDetailsApi(response.data);
      const employmentDefaults = {
        employmentMode: apiEmploymentDefaults.employmentMode ?? localEmploymentDefaults.employmentMode,
        primaryField:
          apiEmploymentDefaults.primaryField ||
          localEmploymentDefaults.primaryField,
        declaredSalaryDay:
          apiEmploymentDefaults.declaredSalaryDay ??
          localEmploymentDefaults.declaredSalaryDay,
      };
      const rejectReason = extractRejectReason(response.data);
      if (rejectReason) {
        setErrorMessage(rejectReason);
      }
      const hasPersonalValues = Object.values(mapped).some((value) => value && value !== '');
      const hasEmploymentValues = Boolean(apiEmploymentDefaults.employmentMode);
      const formPatch: Partial<MergedFormData> = { ...employmentDefaults };
      if (hasPersonalValues) {
        Object.assign(formPatch, mapped);
        await RegistrationService.savePersonalDetails(mapped);
      }
      if (hasEmploymentValues) {
        const employmentFromApi = mapEmploymentDetailsFromPersonalDetailsApi(response.data);
        if (employmentFromApi) {
          await RegistrationService.saveEmploymentType(employmentFromApi.employmentMode);
          await RegistrationService.saveEmploymentDetails(employmentFromApi.details);
        }
      }
      if (hasPersonalValues || hasEmploymentValues || savedMode) {
        reset({ ...getValues(), ...formPatch });
      }
    };
    loadSavedData();
    return () => devLog.screenLeave('personal-details');
  }, [reset, getValues, setErrorMessage]);

  useEffect(() => {
    // If the confirm attempt fails (API error), close the sheet so the user sees the inline error.
    if (!didAttemptConfirmRef.current) return;
    if (isPending) return;
    if (!errorMessage) return;
    didAttemptConfirmRef.current = false;
    setPendingData(null);
  }, [errorMessage, isPending]);

  const onReview = (data: MergedFormData) => {
    clearError();
    // Schema strips extra keys; parse personal fields (transforms pan/name).
    const personal = personalDetailsSchema.parse(data) as PersonalDetails;
    const mode = data.employmentMode as EmploymentType;
    // Build employment details from the reused config (salaried) or minimal shape.
    const details: EmploymentDetails = mode === 'salaried'
      ? FORM_CONFIG_BY_MODE.salaried.buildDetails(data.primaryField ?? '', data.declaredSalaryDay ?? 1)
      : {
          ...MINIMAL_DETAILS_BY_MODE[mode as 'self_employed' | 'unemployed'],
          declaredSalaryDay: data.declaredSalaryDay ?? 1,
        };
    setPendingData({ personal, employmentMode: mode, details });
  };

  const handleConfirm = () => {
    if (!pendingData) return;
    didAttemptConfirmRef.current = true;
    clearError();
    // Persist employment selection locally so a resume can prefill the form.
    void RegistrationService.saveEmploymentType(pendingData.employmentMode);
    void RegistrationService.saveEmploymentDetails(pendingData.details);
    submit(pendingData);
  };

  const handleEdit = () => {
    didAttemptConfirmRef.current = false;
    setPendingData(null);
  };

  // Handle moving to next field when "next" is pressed on keyboard
  // KeyboardAwareScrollView with enableAutomaticScroll will automatically scroll to focused inputs
  const handlePanNext = () => {
    pincodeInputRef.current?.focus();
  };

  const handlePincodeNext = () => {
    dobInputRef.current?.focus();
  };

  const handleDobNext = () => {
    salaryInputRef.current?.focus();
  };

  const confirmationFields = pendingData
    ? [
        ...mapPersonalDetailsToConfirmationFields(pendingData.personal),
        ...mapEmploymentToConfirmationFields(pendingData.employmentMode, pendingData.details),
      ]
    : null;

  return (
    <>
      <FormLayout
        ref={scrollViewRef}
        safeAreaEdges={['bottom']}
        keyboardAwareFooter
        onBack={onPrev}
        footer={
          <>
            <ErrorContainer responseError={errorMessage} />
            <ConsentNotice
              hideLockIcon={true}
              text="Your details are safe and encrypted"
            />
            <Button
              variant="primary"
              size="large"
              fullWidth
              style={{ marginBottom: 0 }}
              disabled={isPending}
              loading={isPending}
              onPress={handleSubmit(onReview, onValidationError)}
            >
              Next →
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Complete Your Basic Details
        </AppText>
        <AppText style={styles.subtext} variant="caption" color='textprimary'>
        This helps us check your loan eligibility instantly
        </AppText>
        <View style={styles.content}>
          <ControlledInput
            control={control}
            name="pan"
            label="PAN Number"
            placeholder="Enter your PAN number"
            autoCapitalize="characters"
            maxLength={10}
            required
            inputRef={panInputRef}
            returnKeyType="next"
            onSubmitEditing={handlePanNext}
          />
          <ControlledInput
            control={control}
            name="pincode"
            label="Pincode"
            placeholder="Enter your pincode"
            keyboardType="number-pad"
            maxLength={6}
            required
            inputRef={pincodeInputRef}
            returnKeyType="next"
            onSubmitEditing={handlePincodeNext}
          />
          <ControlledDateInput
            control={control}
            name="dob"
            label="Date of Birth (as per PAN)"
            required
            inputRef={dobInputRef}
            returnKeyType="next"
            onSubmitEditing={handleDobNext}
          />
          <View style={{ marginBottom: spacing.lg }}>
            <ControlledRadioGroup
              control={control}
              name="gender"
              options={GENDER_OPTIONS}
              label="Gender"
              variant="row"
            />
          </View>
          <ControlledInput
            control={control}
            name="salary"
            label="Monthly Income (₹)"
            placeholder="e.g. 40000"
            keyboardType="number-pad"
            required
            inputRef={salaryInputRef}
            returnKeyType="done"
          />

          <ControlledDropdown
            control={control}
            name="purposeOfLoan"
            label="Purpose of Loan (Optional)"
            options={PURPOSE_OF_LOAN_OPTIONS}
            placeholder="Select purpose of loan"
          />

          {/* [single-screen-merge] Employment type + salaried work details, folded
              in from EmploymentTypeStep / EmploymentDetailsForm. */}
          <View style={styles.employmentSection}>
            <ControlledRadioGroup
              control={control}
              name="employmentMode"
              options={EMPLOYMENT_OPTIONS}
              label="Employment Type"
              variant="card"
            />
            {isSalaried ? (
              <View style={styles.salariedFields}>
                <ControlledInput
                  control={control}
                  name="primaryField"
                  label="Company Name"
                  placeholder={FORM_CONFIG_BY_MODE.salaried.placeholder}
                  required
                  inputRef={companyInputRef}
                />
                <ControlledDropdown
                  control={control}
                  name="declaredSalaryDay"
                  label="Salary Credit Day"
                  options={salaryDayOptions}
                  placeholder="Select day"
                  required
                  helperText="The date your salary is usually credited to your bank account"
                />
              </View>
            ) : null}
            {isSelfEmployed ? (
              <View style={styles.salariedFields}>
                <ControlledDropdown
                  control={control}
                  name="declaredSalaryDay"
                  label="Choose your EMI date"
                  options={salaryDayOptions}
                  placeholder="Select EMI date"
                  required
                  helperText="Day of the month when you prefer to pay your EMI"
                />
              </View>
            ) : null}
          </View>
        </View>
      </FormLayout>

      <ConfirmationSheet
        visible={pendingData !== null}
        title="Please confirm your details"
        data={confirmationFields}
        onEdit={handleEdit}
        onClose={handleEdit}
        onConfirm={handleConfirm}
        editLabel="Edit details"
        confirmLabel="Confirm"
        confirmLoading={isPending}
      />

      {/* Shown on top of loan-journey when the user is found ineligible */}

    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    // marginBottom: spacing.base,
  },
  subtext: {
    color: colors.text.secondary,
    marginVertical: spacing.sm,
  },
  errorContainer: {
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error.light ?? '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    color: colors.error.main,
    textAlign: 'center',
  },
  content: {
    // paddingTop: spacing.base,
  },
  employmentSection: {
    marginTop: spacing.base,
    // Bottom slack (always present) so the scroll-to-error can lift the last
    // fields — the employment radio, or Company Name under the tall card — clear
    // of the footer/keyboard.
    // paddingBottom: spacing['6xl'],
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.base,
  },
  salariedFields: {
    marginTop: spacing.base,
  },
});
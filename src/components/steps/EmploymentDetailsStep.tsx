import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText } from '../AppText';
import { ControlledInput, ControlledDropdown } from '../ControlledInput';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import {
  RegistrationService,
  employmentDetailsFormSchema,
  postEmploymentDetails,
  mapEmploymentDetailsToApi,
  createRegistrationSubmit,
} from '@/src/services/registration';
import { devLog, fireAndForget } from '@/src/utils';
import { executeCredeauSyncOnAppOpen } from '@/src/services/credeau/credeau-sync-service';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { userService } from '@/src/services/user/userService';
import { useFlowStore } from '@/src/store/useFlowStore';
import { applyUserStageResultToStore } from '@/src/services/user/useUserStage';
import { pushLoanJourneyApiError } from '@/src/services/logging/logPoolJourney';
import type { EmploymentType, EmploymentDetails } from '@/src/types/registration';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import ErrorContainer from '../ErrorContainer';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import { appConfig } from '@/src/config/appConfig';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import type { UserStageContext, UserStageSectionsCompleted } from '@/src/types/user';
import { ConsentNotice } from '../ConsentNotice';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';

type EmploymentPayload = { employmentMode: EmploymentType; details: EmploymentDetails };

// Generate options for salary day dropdown (1-31)
export const salaryDayOptions = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1,
}));

type EmploymentFormConfig = {
  placeholder: string;
  submitLabel: string;
  logLabel: string;
  getSavedPrimaryValue: (details: EmploymentDetails) => string;
  buildDetails: (primaryField: string, declaredSalaryDay: number) => EmploymentDetails;
};

/** Minimal details for direct API call when no form is shown (self_employed / unemployed). */
 export const MINIMAL_DETAILS_BY_MODE: Record<'self_employed' | 'unemployed', EmploymentDetails> = {
  self_employed: {
    businessName: '',
    designation: '',
    netMonthlyIncome: '',
    declaredSalaryDay: 1,
  },
  unemployed: {
    currentActivity: '',
    netMonthlyIncome: '',
    declaredSalaryDay: 1,
  },
};

export const FORM_CONFIG_BY_MODE: Record<EmploymentType, EmploymentFormConfig> = {
  salaried: {
    placeholder: 'Enter your company name',
    submitLabel: 'Next →',
    logLabel: 'Salaried Details',
    getSavedPrimaryValue: (details) => ('companyName' in details ? details.companyName : ''),
    buildDetails: (primaryField, declaredSalaryDay) => ({
      companyName: primaryField,
      designation: '',
      netMonthlyIncome: '',
      declaredSalaryDay,
    }),
  },
  self_employed: {
    placeholder: 'e.g. TechGrow Solutions',
    submitLabel: 'Next →',
    logLabel: 'Self-Employed Details',
    getSavedPrimaryValue: (details) => ('businessName' in details ? details.businessName : ''),
    buildDetails: (primaryField, declaredSalaryDay) => ({
      businessName: primaryField,
      designation: '',
      netMonthlyIncome: '',
      declaredSalaryDay,
    }),
  },
  unemployed: {
    placeholder: 'e.g. Coaching Institute, Self Study',
    submitLabel: 'Next →',
    logLabel: 'Unemployed Details',
    getSavedPrimaryValue: (details) => ('currentActivity' in details ? details.currentActivity : ''),
    buildDetails: (primaryField, declaredSalaryDay) => ({
      currentActivity: primaryField,
      netMonthlyIncome: '',
      declaredSalaryDay,
    }),
  },
};

const EmploymentDetailsContainer = () => {
  return (
    <>
      <AppText style={styles.title} variant="h4" weight="semiBold">
        Your Work Details
      </AppText>
      <AppText style={styles.subtitle} variant="caption" color='textprimary'>
        We use this to prepare the best loan offer for you
      </AppText>
    </>
  );
};

interface EmploymentDetailsFooterProps {
  isPending: boolean;
  onPress: () => void;
  label?: string;
  errorMessage?: string;
}

const EmploymentDetailsFooter = ({
  isPending,
  onPress,
  label = 'Next →',
  errorMessage = '',
}: EmploymentDetailsFooterProps) => (
  <>
    <ConsentNotice
      hideLockIcon={true}
      text="Your information is confidential and secure"
    />
    <ErrorContainer responseError={errorMessage} />
    <Button
      variant="primary"
      size="large"
      fullWidth
      disabled={isPending}
      loading={isPending}
      onPress={onPress}
    >
      {label}
    </Button>
  </>
);

/**
 * After employment details are submitted, check eligibility if needed,
 * then sync with backend stage to determine next navigation.
 */
export async function handlePostSubmitSuccess({
  onNext,
  setErrorMessage,
  syncFromUserStage,
  currentStage,
}: {
  onNext: () => void;
  setErrorMessage: (message: string) => void;
  syncFromUserStage: (
    stage: UserStage,
    sectionsCompleted?: UserStageSectionsCompleted,
    context?: UserStageContext
  ) => void;
  currentStage: UserStage;
}) {
  // Step 1: Fetch the current user stage from backend
  const stageResponse = await userService.getUserStage();

  if (!stageResponse.success) {
    pushLoanJourneyApiError(
      'employment details get user stage',
      stageResponse.error,
      stageResponse.status
    );
    const message = getApiErrorDisplayMessage(stageResponse.error);
    setErrorMessage(message || 'Failed to fetch user stage. Please try again.');
    return;
  }

  applyUserStageResultToStore(stageResponse.data);

  const backendStage = stageResponse.data?.stage;

  if (!backendStage) {
    // No stage returned, proceed to next step
    onNext();
    return;
  }

  // Step 2: When backend stage is SOFT_PULL, navigate to SoftPullStep
  // The SoftPullStep handles eligibility check + offer retrieval + conditional navigation.
  // This keeps the eligibility logic centralized in one place (single source of truth).
  // See: src/services/registration/softPullFlow.ts for eligibility flow logic.
  if (backendStage === UserStagesInBackend.SOFT_PULL) {
    devLog.formData('EmploymentDetailsStep', {
      message: 'Stage is SOFT_PULL, navigating to SoftPullStep for eligibility check.'
    });

    // Fire-and-forget: Credeau sync must start before soft pull; does not block navigation.
    fireAndForget(executeCredeauSyncOnAppOpen(), {
      context: 'employment-details.pre-softpull-credeau-sync',
    });

    // If stage matches current step, move to next step (SoftPullStep)
    if (backendStage === currentStage) {
      onNext();
      return;
    }

    // If stage is different, sync to backend stage (will navigate to SoftPullStep)
    syncFromUserStage(
      backendStage as UserStage,
      stageResponse.data?.sectionsCompleted,
      stageResponse.data?.context
    );
    return;
  }

  // Step 3: Stage is not SOFT_PULL, skip eligibility check and sync with backend stage
  devLog.formData('EmploymentDetailsStep', { message: `Stage is "${backendStage}", skipping eligibility check.` });

  if (backendStage === currentStage) {
    onNext();
    return;
  }

  syncFromUserStage(
    backendStage as UserStage,
    stageResponse.data?.sectionsCompleted,
    stageResponse.data?.context
  );
}

const submitEmploymentDetails = createRegistrationSubmit<EmploymentPayload, ReturnType<typeof mapEmploymentDetailsToApi>>({
  useMock: appConfig.useMockApi,
  mockSave: ({ details }) => RegistrationService.saveEmploymentDetails(details),
  mapToPayload: ({ employmentMode, details }) => mapEmploymentDetailsToApi(employmentMode, details),
  apiCall: postEmploymentDetails,
});

export function EmploymentDetailsStep({ onNext, onPrev }: StepProps) {
  const [employmentMode, setEmploymentMode] = React.useState<EmploymentType | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await RegistrationService.getRegistrationData();
      if (data?.employmentMode) {
        setEmploymentMode(data.employmentMode as EmploymentType);
      }

      if (data?.employmentDetails) {
        return;
      }

      // Temporarily skip fetching employment details from API.
      // const response = await getEmploymentDetails();
      // if (response.success) {
      //   const mapped = mapEmploymentDetailsFromApi(response.data);
      //   if (mapped.employmentMode && mapped.details) {
      //     await RegistrationService.saveEmploymentType(mapped.employmentMode);
      //     await RegistrationService.saveEmploymentDetails(mapped.details);
      //     setEmploymentMode(mapped.employmentMode);
      //   }
      // }
    };
    load();
  }, []);

  if (employmentMode === 'salaried') {
    return (
      <EmploymentDetailsForm employmentMode={employmentMode} onNext={onNext} onPrev={onPrev} />
    );
  }
  if (employmentMode === 'self_employed' || employmentMode === 'unemployed') {
    return (
      <DirectEmploymentSubmit employmentMode={employmentMode} onNext={onNext} onPrev={onPrev} />
    );
  }

  // Brief loading state while employmentMode is fetched from storage
  return (
    <FormLayout
      showContactSupport
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={
        <Button variant="primary" size="large" fullWidth disabled>
          Loading...
        </Button>
      }
    >
      <AppText variant="body">Loading...</AppText>
    </FormLayout>
  );
}

// Props for the unified employment details form
interface EmploymentSubFormProps extends StepProps {
  employmentMode: EmploymentType;
}

/** Calls postEmploymentDetails immediately with minimal details (no form). Used for self_employed and unemployed. */
function DirectEmploymentSubmit({
  employmentMode,
  onNext,
  onPrev,
}: EmploymentSubFormProps & { employmentMode: 'self_employed' | 'unemployed' }) {
  const currentStage: UserStage = UserStagesInBackend.SOFT_PULL;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();

  const { submit, isPending, errorMessage, setErrorMessage } = useRegistrationSubmit<EmploymentPayload>({
    mutationFn: submitEmploymentDetails,
    onSuccess: async () => {
      void logAnalyticsEvent(ANALYTICS_EVENT.ORGANISATION_DETAIL_PAGE_SUBMIT);
      await handlePostSubmitSuccess({ onNext, setErrorMessage, syncFromUserStage, currentStage });
    },
    onFailedResponse: handleFailedResponse,
  });

  useEffect(() => {
    const details = MINIMAL_DETAILS_BY_MODE[employmentMode];
    submit({ employmentMode, details });
  }, [employmentMode, submit]);

  const handleRetry = () => {
    const details = MINIMAL_DETAILS_BY_MODE[employmentMode];
    submit({ employmentMode, details });
  };

  return (
    <FormLayout
      showContactSupport
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={
        isPending ? (
          <Button variant="primary" size="large" fullWidth loading={isPending}>
            Submitting...
          </Button>
        ) : errorMessage ? (
          <>
            <ErrorContainer responseError={errorMessage} />
            <Button variant="primary" size="large" fullWidth onPress={handleRetry}>
              Try again
            </Button>
          </>
        ) : (
          <View />
        )
      }
    >
      <EmploymentDetailsContainer />
      {isPending && (
        <AppText variant="body" style={styles.subtitle}>
          Submitting...
        </AppText>
      )}
    </FormLayout>
  );
}

function EmploymentDetailsForm({ employmentMode, onNext, onPrev }: EmploymentSubFormProps) {
  const config = FORM_CONFIG_BY_MODE[employmentMode];
  const currentStage: UserStage = UserStagesInBackend.SOFT_PULL;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();

  const { submit, isPending, errorMessage, clearError, setErrorMessage } =
    useRegistrationSubmit<EmploymentPayload>({
      mutationFn: submitEmploymentDetails,
      onSuccess: async () => {
        void logAnalyticsEvent(ANALYTICS_EVENT.ORGANISATION_DETAIL_PAGE_SUBMIT);
        await handlePostSubmitSuccess({ onNext, setErrorMessage, syncFromUserStage, currentStage });
      },
      onFailedResponse: handleFailedResponse,
    });

  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(employmentDetailsFormSchema),
    defaultValues: { primaryField: '', declaredSalaryDay: 1 },
  });

  useEffect(() => {
    const load = async () => {
      const saved = await RegistrationService.getRegistrationData();
      if (saved?.employmentDetails) {
        const primary = config.getSavedPrimaryValue(saved.employmentDetails);
        const day = saved.employmentDetails.declaredSalaryDay;
        reset({ primaryField: primary, declaredSalaryDay: day });
      }
    };
    load();
  }, [config, reset]);

  const onSubmit = (data: { primaryField: string; declaredSalaryDay: number }) => {
    clearError();
    devLog.formData(config.logLabel, data);
    submit({
      employmentMode,
      details: config.buildDetails(data.primaryField, data.declaredSalaryDay),
    });
  };

  return (
    <FormLayout
      showContactSupport
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      keyboardAwareFooter
      footer={
        <EmploymentDetailsFooter
          isPending={isPending}
          onPress={handleSubmit(onSubmit)}
          label={config.submitLabel}
          errorMessage={errorMessage}
        />
      }
    >
      <EmploymentDetailsContainer />
      <View style={styles.content}>
        <ControlledInput
          control={control}
          name="primaryField"
          label="Company Name"
          placeholder={config.placeholder}
          required
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
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    // color: colors.text.primary,
    // marginBottom: spacing.base,
  },
  content: {
    paddingTop: spacing.base,
  },
});

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { RadioGroup } from '../RadioGroup';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import {
  RegistrationService,
  toErrorResponse,
} from '@/src/services/registration';
import { EMPLOYMENT_OPTIONS } from '@/src/data/registration';
import { devLog } from '@/src/utils';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import type { EmploymentType } from '@/src/types/registration';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import ErrorContainer from '../ErrorContainer';
import type { ApiResponse } from '@/src/types/api';
import { ConsentNotice } from '../ConsentNotice';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';

const submitEmploymentType = async (type: EmploymentType): Promise<ApiResponse<unknown>> => {
  try {
    await RegistrationService.saveEmploymentType(type);
    return { success: true, data: {} };
  } catch (error) {
    return toErrorResponse(error);
  }
};

export function EmploymentTypeStep({ onNext, onPrev }: StepProps) {
  const [selectedType, setSelectedType] = useState<EmploymentType | undefined>(undefined);
  const { handleFailedResponse } = useIneligibilityModal();
  const { submit, isPending, errorMessage, clearError } = useRegistrationSubmit<EmploymentType>({
    mutationFn: submitEmploymentType,
    // Intentionally skip user stage API — go straight to next step.
    onSuccess: () => {
      void logAnalyticsEvent(ANALYTICS_EVENT.EMPLOYMENT_DETAIL_PAGE_SUBMIT);
      onNext();
    },
    onFailedResponse: handleFailedResponse,
  });

  const handleVerify = () => {
    if (!selectedType) return;
    clearError();
    devLog.formData('Employment Type', { employmentMode: selectedType });
    submit(selectedType);
  };

  return (
    <>
      <FormLayout
        showContactSupport
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        footer={
          <>
            <ErrorContainer responseError={errorMessage} />
            <ConsentNotice
              hideLockIcon={true}
              text="Choosing the correct option helps avoid delays"
            />
            <Button
              variant="primary"
              size="large"
              fullWidth
              disabled={!selectedType || isPending}
              loading={isPending}
              onPress={handleVerify}
            >
              Next →
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
        Let’s get to know your work life
        </AppText>
        <AppText style={styles.subtitle} variant="caption" color='textprimary'>
        This helps us tailor offers just for you safely and securely
        </AppText>
        <RadioGroup
          options={EMPLOYMENT_OPTIONS}
          value={selectedType}
          onChange={setSelectedType}
          // label="Select your mode of employment"
          variant="card"
        />
      </FormLayout>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    // color: colors.text.primary,
    marginBottom: spacing.base,
  },
  privacy: {
    color: colors.text.secondary,
    marginTop: spacing.lg,
  },
});

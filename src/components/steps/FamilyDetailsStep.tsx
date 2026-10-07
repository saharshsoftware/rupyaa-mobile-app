import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  useScrollToFirstError,
  type ScrollViewScrollToFocusedInput,
} from '@/hooks/useScrollToFirstError';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppText } from '../AppText';
import { ControlledInput } from '../ControlledInput';
import { ControlledRelationshipDropdown } from '../RelationshipDropdown';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import ErrorContainer from '../ErrorContainer';
import {
  createRegistrationSubmit,
  postFamilyDetails,
  handleRegistrationStepSuccess,
} from '@/src/services/registration';
import { useFlowStore } from '@/src/store/useFlowStore';
import { familyDetailsSchema } from '@/src/utils/validation/kycSchemas';
import type { PostFamilyDetailsRequest } from '@/src/types/kyc';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import { appConfig } from '@/src/config/appConfig';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { ConsentNotice } from '../ConsentNotice';
import { PhonePrefix } from '../PhonePrefix';
import { CONSENT_MESSAGE } from '@/src/constants/data';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';

type FamilyDetailsFormData = z.input<typeof familyDetailsSchema>;

const FAMILY_FIELD_ORDER: (keyof FamilyDetailsFormData)[] = [
  'name',
  'relation',
  'mobile',
];

function mapFamilyDetailsToApi(
  form: FamilyDetailsFormData
): PostFamilyDetailsRequest {
  return {
    familyMember: {
      name: form.name.trim(),
      relation: (form.relation ?? '').trim(),
      mobile: form.mobile.trim(),
    },
  };
}

const submitFamilyDetails = createRegistrationSubmit<
  FamilyDetailsFormData,
  PostFamilyDetailsRequest
>({
  useMock: appConfig.useMockApi,
  mockSave: async () => {},
  mapToPayload: mapFamilyDetailsToApi,
  apiCall: postFamilyDetails,
});

/**
 * Family Details step — collects one family member's name, relation, and mobile.
 * Required for KYC verification.
 */
export function FamilyDetailsStep({ onNext, onPrev }: StepProps) {
  const currentStage: UserStage = UserStagesInBackend.FAMILY_REFERENCE;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();

  const { submit, isPending, errorMessage, clearError } =
    useRegistrationSubmit<FamilyDetailsFormData>({
      mutationFn: submitFamilyDetails,
      onSuccess: () => {
        void logAnalyticsEvent(ANALYTICS_EVENT.FAMILY_DETAIL_PAGE_SUBMIT);
        void handleRegistrationStepSuccess({
          currentStage,
          onNext,
          syncFromUserStage,
        });
      },
      onFailedResponse: handleFailedResponse,
    });

  const { control, handleSubmit } = useForm<FamilyDetailsFormData>({
    resolver: zodResolver(familyDetailsSchema),
    defaultValues: {
      name: '',
      relation: undefined,
      mobile: '',
    },
  });

  // Refs for scroll view and keyboard next-field navigation.
  // relation is a dropdown so it is skipped in the keyboard chain: name → mobile.
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const nameRef = useRef<TextInput>(null);
  const mobileRef = useRef<TextInput>(null);

  const familyFieldRefs = useMemo(
    () => ({ name: nameRef, mobile: mobileRef }),
    []
  );
  const onValidationError = useScrollToFirstError<FamilyDetailsFormData>(
    FAMILY_FIELD_ORDER,
    familyFieldRefs,
    scrollViewRef as React.RefObject<ScrollViewScrollToFocusedInput | null>
  );

  const handleNameNext = () => {
    mobileRef.current?.focus();
  };

  const onSubmit = (data: FamilyDetailsFormData) => {
    clearError();
    submit(data);
  };

  return (
    <>
      <FormLayout
        showContactSupport
        ref={scrollViewRef}
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        keyboardAwareFooter
        footer={
          <>
            <ErrorContainer responseError={errorMessage} />
            <Button
              variant="primary"
              size="large"
              fullWidth
              style={{ marginBottom: 0 }}
              disabled={isPending}
              loading={isPending}
              onPress={handleSubmit(onSubmit, onValidationError)}
            >
              Next →
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Family Details
        </AppText>
        <AppText style={styles.subtitle} variant="caption" color="textprimary">
          Help us know your family. This information is required for KYC
          verification
        </AppText>
        <View style={styles.content}>
          <ControlledInput
            control={control}
            name="name"
            label="Name"
            labelWeight="semiBold"
            placeholder="e.g. John Doe"
            autoCapitalize="words"
            required
            inputRef={nameRef}
            returnKeyType="next"
            onSubmitEditing={handleNameNext}
          />
          <ControlledRelationshipDropdown
            control={control}
            name="relation"
            label="Relationship"
            labelWeight="semiBold"
            required
          />
          <ControlledInput
            control={control}
            name="mobile"
            label="Mobile"
            labelWeight="semiBold"
            leftAccessory={<PhonePrefix />}
            placeholder="10-digit number"
            keyboardType="phone-pad"
            maxLength={10}
            required
            inputRef={mobileRef}
            returnKeyType="done"
          />
        </View>
      </FormLayout>

    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    fontSize: 20,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  content: {
    paddingTop: spacing.base,
  },
});

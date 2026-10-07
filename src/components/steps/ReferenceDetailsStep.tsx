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
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import ErrorContainer from '../ErrorContainer';
import {
  createRegistrationSubmit,
  postReferenceDetails,
  handleRegistrationStepSuccess,
} from '@/src/services/registration';
import { useFlowStore } from '@/src/store/useFlowStore';
import { referenceDetailsSchema } from '@/src/utils/validation/kycSchemas';
import type { PostReferenceDetailsRequest } from '@/src/types/kyc';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing, radius } from '@/src/theme';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import { appConfig } from '@/src/config/appConfig';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { PhonePrefix } from '../PhonePrefix';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';

type ReferenceDetailsFormData = z.input<typeof referenceDetailsSchema>;

const REFERENCE_FIELD_ORDER: (keyof ReferenceDetailsFormData)[] = [
  'ref1Name',
  'ref1Mobile',
  'ref2Name',
  'ref2Mobile',
];

function mapReferenceDetailsToApi(
  form: ReferenceDetailsFormData
): PostReferenceDetailsRequest {
  return {
    reference1: {
      name: form.ref1Name.trim(),
      mobile: form.ref1Mobile.trim(),
      relationship: '',
    },
    reference2: {
      name: form.ref2Name.trim(),
      mobile: form.ref2Mobile.trim(),
      relationship: '',
    },
  };
}

const submitReferenceDetails = createRegistrationSubmit<
  ReferenceDetailsFormData,
  PostReferenceDetailsRequest
>({
  useMock: appConfig.useMockApi,
  mockSave: async () => {},
  mapToPayload: mapReferenceDetailsToApi,
  apiCall: postReferenceDetails,
});

/**
 * Reference Details step — collects two personal references
 * with name, mobile, and relationship. Required by lenders for KYC / loan verification.
 */
export function ReferenceDetailsStep({ onNext, onPrev }: StepProps) {
  const currentStage: UserStage = UserStagesInBackend.FAMILY_REFERENCE;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();

  const { submit, isPending, errorMessage, clearError } =
    useRegistrationSubmit<ReferenceDetailsFormData>({
      mutationFn: submitReferenceDetails,
      onSuccess: () => {
        void logAnalyticsEvent(ANALYTICS_EVENT.REFERENCE_PAGE_SUBMIT);
        void handleRegistrationStepSuccess({
          currentStage,
          onNext,
          syncFromUserStage,
        });
      },
      onFailedResponse: handleFailedResponse,
    });

  const { control, handleSubmit } = useForm<ReferenceDetailsFormData>({
    resolver: zodResolver(referenceDetailsSchema),
    defaultValues: {
      ref1Name: '',
      ref1Mobile: '',
      ref2Name: '',
      ref2Mobile: '',
    },
  });

  // Refs for scroll view and keyboard next-field navigation.
  // Chain: ref1Name → ref1Mobile → ref2Name → ref2Mobile (done)
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const ref1NameRef = useRef<TextInput>(null);
  const ref1MobileRef = useRef<TextInput>(null);
  const ref2NameRef = useRef<TextInput>(null);
  const ref2MobileRef = useRef<TextInput>(null);

  const referenceFieldRefs = useMemo(
    () => ({
      ref1Name: ref1NameRef,
      ref1Mobile: ref1MobileRef,
      ref2Name: ref2NameRef,
      ref2Mobile: ref2MobileRef,
    }),
    []
  );
  const onValidationError = useScrollToFirstError<ReferenceDetailsFormData>(
    REFERENCE_FIELD_ORDER,
    referenceFieldRefs,
    scrollViewRef as React.RefObject<ScrollViewScrollToFocusedInput | null>
  );

  const handleRef1NameNext = () => {
    ref1MobileRef.current?.focus();
  };

  const handleRef1MobileNext = () => {
    ref2NameRef.current?.focus();
  };

  const handleRef2NameNext = () => {
    ref2MobileRef.current?.focus();
  };

  const onSubmit = (data: ReferenceDetailsFormData) => {
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
              Next
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
        Add Two References
        </AppText>
        <AppText style={styles.subtitle} variant="caption" color="textprimary">
        To complete your loan process, please share details of two people who know you well
        </AppText>

        <View style={styles.referenceCard}>
          <View style={styles.referenceHeader}>
            <AppText style={styles.referenceLabel} variant="caption" weight="semiBold">
              Reference 1
            </AppText>
          </View>
          <View style={styles.referenceFields}>
            <ControlledInput
              control={control}
              name="ref1Name"
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              autoCapitalize="words"
              required
              inputRef={ref1NameRef}
              returnKeyType="next"
              onSubmitEditing={handleRef1NameNext}
            />
            <ControlledInput
              control={control}
              name="ref1Mobile"
              label="Mobile Number"
              leftAccessory={<PhonePrefix />}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              maxLength={10}
              required
              inputRef={ref1MobileRef}
              returnKeyType="next"
              onSubmitEditing={handleRef1MobileNext}
            />
          </View>
        </View>

        <View style={styles.referenceCard}>
          <View style={styles.referenceHeader}>
            <AppText style={styles.referenceLabel} variant="caption" weight="semiBold">
              Reference 2
            </AppText>
          </View>
          <View style={styles.referenceFields}>
            <ControlledInput
              control={control}
              name="ref2Name"
              label="Full Name"
              placeholder="e.g. Priya Verma"
              autoCapitalize="words"
              required
              inputRef={ref2NameRef}
              returnKeyType="next"
              onSubmitEditing={handleRef2NameNext}
            />
            <ControlledInput
              control={control}
              name="ref2Mobile"
              label="Mobile Number"
              leftAccessory={<PhonePrefix />}
              placeholder="e.g. 9123456789"
              keyboardType="phone-pad"
              maxLength={10}
              required
              inputRef={ref2MobileRef}
              returnKeyType="done"
            />
          </View>
        </View>

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
    // color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  referenceCard: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  referenceLabel: {
    color: colors.text.primary,
  },
  referenceFields: {
    gap: 0,
  },
});

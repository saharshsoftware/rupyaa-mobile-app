import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import {
  useScrollToFirstError,
  type ScrollViewScrollToFocusedInput,
} from '@/hooks/useScrollToFirstError';
import type { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppText } from '../AppText';
import { ControlledInput } from '../ControlledInput';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import {
  createRegistrationSubmit,
  postResidenceAddress,
  handleRegistrationStepSuccess,
} from '@/src/services/registration';
import { useFlowStore } from '@/src/store/useFlowStore';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { getCityStateFromPincode } from '@/src/services/location/pincodeService';
import { addressDetailsSchema } from '@/src/utils/validation/kycSchemas';
import type { AddressDetails, PostResidenceAddressRequest } from '@/src/types/kyc';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import ErrorContainer from '../ErrorContainer';
import { appConfig } from '@/src/config/appConfig';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import { consoleLogDev } from '@/src/utils/common-helper';

type AddressDetailsFormData = z.input<typeof addressDetailsSchema>;
type PincodeLookupMessage = { text: string; tone: 'info' | 'warning' } | null;

const PINCODE_LOOKUP_MESSAGES: Record<'network_error' | 'timeout', string> = {
  network_error: 'Unable to verify pincode right now. Please enter city and state manually.',
  timeout: 'Pincode lookup took too long. Please enter city and state manually.',
};
const normalizeLocationText = (text: string) => text.replace(/[^A-Za-z0-9 ]/g, '');

function mapAddressDetailsToApi(
  form: AddressDetails
): PostResidenceAddressRequest {
  return {
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2.trim(),
    pinCode: form.pinCode.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
  };
}

const submitAddressDetails = createRegistrationSubmit<
  AddressDetails,
  PostResidenceAddressRequest
>({
  useMock: appConfig.useMockApi,
  mockSave: async () => {},
  mapToPayload: mapAddressDetailsToApi,
  apiCall: postResidenceAddress,
});

const ADDRESS_FIELD_ORDER: (keyof AddressDetailsFormData)[] = [
  'addressLine1',
  'addressLine2',
  'pinCode',
  'city',
  'state',
];

export function AddressDetailsStep({ onNext, onPrev }: StepProps) {
  const [pincodeLookupLoading, setPincodeLookupLoading] = useState(false);
  const [pincodeLookupMessage, setPincodeLookupMessage] =
    useState<PincodeLookupMessage>(null);
  const [isCityStateEditable, setIsCityStateEditable] = useState(false);
  const scrollViewRef = useRef<KeyboardAwareScrollView | null>(null);
  const addressLine1Ref = useRef<TextInput>(null);
  const addressLine2Ref = useRef<TextInput>(null);
  const pincodeInputRef = useRef<TextInput>(null);
  const cityInputRef = useRef<TextInput>(null);
  const stateInputRef = useRef<TextInput>(null);
  const currentStage: UserStage = UserStagesInBackend.ADDRESS_DETAILS;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();

  const { submit, isPending, errorMessage, clearError } =
    useRegistrationSubmit<AddressDetails>({
      mutationFn: submitAddressDetails,
      onSuccess: () => {
        void logAnalyticsEvent(ANALYTICS_EVENT.ADDRESS_PAGE_SUBMIT);
        void handleRegistrationStepSuccess({
          currentStage,
          onNext,
          syncFromUserStage,
        });
      },
      onFailedResponse: handleFailedResponse,
    });

  const { control, handleSubmit, watch, setValue, setError, clearErrors } =
    useForm<AddressDetailsFormData>({
      resolver: zodResolver(addressDetailsSchema),
      defaultValues: {
        addressLine1: '',
        addressLine2: '',
        pinCode: '',
        city: '',
        state: '',
      },
    });

  const pincodeValue = watch('pinCode');

  useEffect(() => {
    const trimmed = pincodeValue?.trim() ?? '';
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setPincodeLookupLoading(false);
      setPincodeLookupMessage(null);
      setIsCityStateEditable(false);
      clearErrors('pinCode');
      clearErrors(['city', 'state']);
      setValue('city', '');
      setValue('state', '');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const run = async () => {
            setPincodeLookupLoading(true);
      setIsCityStateEditable(false);
      clearErrors(['city', 'state']);
      setValue('city', '');
      setValue('state', '');
      try {
        const result = await getCityStateFromPincode(trimmed, controller.signal);
        if (cancelled) return;
        //debugger

        if (result.ok) {
          clearErrors('pinCode');
          clearErrors(['city', 'state']);
          setPincodeLookupMessage(null);
          setIsCityStateEditable(false);
          setValue('city', result.city, { shouldValidate: true });
          setValue('state', result.state, { shouldValidate: true });
          return;
        }
        if (result.reason === 'not_found') {
          clearErrors(['city', 'state']);
          setValue('city', '');
          setValue('state', '');
          setPincodeLookupMessage(null);
          setIsCityStateEditable(false);
          setError('pinCode', {
            type: 'manual',
            message: 'No records found for this pincode. Please check and try again.',
          });
          return;
        }

        clearErrors('pinCode');
        if (result.reason === 'invalid') {
          setPincodeLookupMessage(null);
          setIsCityStateEditable(false);
          return;
        }

        clearErrors(['city', 'state']);
        setValue('city', '');
        setValue('state', '');
        setIsCityStateEditable(true);
        setPincodeLookupMessage({
          text: PINCODE_LOOKUP_MESSAGES[result.reason],
          tone: result.reason === 'timeout' ? 'warning' : 'info',
        });
      } finally {
        if (!cancelled) {
          setPincodeLookupLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [clearErrors, pincodeValue, setError, setValue]);

  const handleAddressLine1Next = () => {
    addressLine2Ref.current?.focus();
  };

  const handleAddressLine2Next = () => {
    pincodeInputRef.current?.focus();
  };

  const handlePincodeNext = () => {
    cityInputRef.current?.focus();
  };

  const handleCityNext = () => {
    stateInputRef.current?.focus();
  };

  const addressFieldRefs = useMemo(
    () => ({
      addressLine1: addressLine1Ref,
      addressLine2: addressLine2Ref,
      pinCode: pincodeInputRef,
      city: cityInputRef,
      state: stateInputRef,
    }),
    []
  );
  const onValidationError = useScrollToFirstError<AddressDetailsFormData>(
    ADDRESS_FIELD_ORDER,
    addressFieldRefs,
    scrollViewRef as React.RefObject<ScrollViewScrollToFocusedInput | null>
  );

  const onSubmit = (data: AddressDetailsFormData) => {
    clearError();
    const transformed = addressDetailsSchema.parse(data) as AddressDetails;
    submit(transformed);
  };

  return (
    <>
      <FormLayout
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
              Continue
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Your offer&apos;s locked in just need your address!
        </AppText>
        <AppText style={styles.subtitle} variant="caption" color="textprimary">
          A few quick details and we&apos;re ready to go
        </AppText>
        <View style={styles.content}>
          <ControlledInput
            control={control}
            name="addressLine1"
            label="Address Line 1"
            placeholder="Flat/House No., Building Name"
            required
            maxLength={100}
            inputRef={addressLine1Ref}
            returnKeyType="next"
            onSubmitEditing={handleAddressLine1Next}
          />
          <ControlledInput
            control={control}
            name="addressLine2"
            label="Address Line 2"
            placeholder="Street, Locality, Area"
            required
            maxLength={100}
            inputRef={addressLine2Ref}
            returnKeyType="next"
            onSubmitEditing={handleAddressLine2Next}
          />
          <ControlledInput
            control={control}
            name="pinCode"
            label="Pincode"
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            required
            inputRef={pincodeInputRef}
            returnKeyType="next"
            onSubmitEditing={handlePincodeNext}
          />
          {pincodeLookupMessage ? (
            <AppText
              style={[
                styles.lookupMessage,
                pincodeLookupMessage.tone === 'warning'
                  ? styles.lookupMessageWarning
                  : styles.lookupMessageInfo,
              ]}
              variant="caption"
            >
              {pincodeLookupMessage.text}
            </AppText>
          ) : null}
          <ControlledInput
            control={control}
            name="city"
            label="City"
            placeholder={
              pincodeLookupLoading
                ? 'Looking up...'
                : isCityStateEditable
                  ? 'Enter city'
                  : 'Auto-filled from pincode'
            }
            inputRef={cityInputRef}
            editable={isCityStateEditable}
            selectTextOnFocus={false}
            blockBulkInsert
            normalizeText={normalizeLocationText}
            style={!isCityStateEditable ? styles.disabledInput : undefined}
            returnKeyType="next"
            onSubmitEditing={handleCityNext}
          />
          <ControlledInput
            control={control}
            name="state"
            label="State"
            placeholder={
              pincodeLookupLoading
                ? 'Looking up...'
                : isCityStateEditable
                  ? 'Enter state'
                  : 'Auto-filled from pincode'
            }
            inputRef={stateInputRef}
            editable={isCityStateEditable}
            selectTextOnFocus={false}
            blockBulkInsert
            normalizeText={normalizeLocationText}
            style={!isCityStateEditable ? styles.disabledInput : undefined}
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
  lookupMessage: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  lookupMessageInfo: {
    color: colors.info.main,
  },
  lookupMessageWarning: {
    color: colors.warning.main,
  },
  disabledInput: {
    color: colors.text.secondary,
  },
});

import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  useScrollToFirstError,
  type ScrollViewScrollToFocusedInput,
} from '@/hooks/useScrollToFirstError';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppText } from '../AppText';
import { ControlledDropdown, ControlledInput } from '../ControlledInput';
import { FormInput } from '../FormInput';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { ConsentNotice } from '../ConsentNotice';
import { BankDetailsConfirmationModal } from '../BankDetailsConfirmationModal';
import { NonSalaryAccountModal, SalaryAccountHintText } from '../non-salary-account';
import ErrorContainer from '../ErrorContainer';
import type { DropdownOption } from '../DropdownSelect';
import {
  createRegistrationSubmit,
  postBankDetails,
  handleRegistrationStepSuccess,
} from '@/src/services/registration';
import { useFlowStore } from '@/src/store/useFlowStore';
import { bankDetailsSchema } from '@/src/utils/validation/kycSchemas';
import {
  BANK_ACCOUNT_TYPE_VALUES,
  type BankAccountType,
  type BankDetails,
  type PostBankDetailsRequest,
} from '@/src/types/kyc';
import type { StepProps } from '@/src/types/flow';
import { colors, radius, spacing, typography } from '@/src/theme';
import { useRegistrationSubmit } from '@/hooks/useRegistrationSubmit';
import { useSalaryAccounts } from '@/hooks/useSalaryAccounts';
import { isEnteredAccountSalaryMatch } from '@/src/utils/salaryAccountValidation';
import { appConfig } from '@/src/config/appConfig';
import { UserStagesInBackend, type UserStage } from '@/src/config/userStages';
import { useIneligibilityModal } from '@/hooks/useIneligibilityModal';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';
import {
  lookupIfsc,
  isValidIfscFormat,
  type IfscLookupStatus,
} from '@/src/services/ifsc';

type BankDetailsFormData = z.input<typeof bankDetailsSchema>;

const BANK_FIELD_ORDER: (keyof BankDetailsFormData)[] = [
  'accountNumber',
  'confirmAccountNumber',
  'accountHolderName',
  'accountType',
  'ifscCode',
  'bankName',
  'branchName',
];

const ACCOUNT_TYPE_OPTIONS: DropdownOption<BankAccountType>[] =
  BANK_ACCOUNT_TYPE_VALUES.map((value) => ({ label: value, value }));

const IFSC_STATUS_MESSAGES: Record<IfscLookupStatus, string> = {
  idle: 'Enter the IFSC as mentioned in your passbook or cheque',
  loading: 'Searching…',
  success: 'Bank details fetched',
  invalid: 'Invalid IFSC — check and re-enter',
  unavailable: "Couldn't fetch details — enter bank/branch manually",
  stale: "IFSC changed",
};

function mapBankDetailsToApi(form: BankDetails): PostBankDetailsRequest {
  return {
    accountHolderName: form.accountHolderName.trim(),
    accountNumber: form.accountNumber.trim(),
    ifscCode: form.ifscCode.trim().toUpperCase(),
    bankName: form.bankName.trim(),
    branchName: form.branchName.trim(),
    accountType: form.accountType,
  };
}

const submitBankDetails = createRegistrationSubmit<
  BankDetailsFormData,
  PostBankDetailsRequest
>({
  useMock: appConfig.useMockApi,
  mockSave: async () => {},
  mapToPayload: mapBankDetailsToApi,
  apiCall: postBankDetails,
});

/**
 * Bank Details step — collects account holder name, IFSC, bank/branch and account info.
 * Required for bank verification. API integration ready for POST /user/post-bank-details.
 */
export function BankDetailsStep({ onNext, onPrev }: StepProps) {
  const currentStage: UserStage = UserStagesInBackend.BANK_DETAILS;
  const syncFromUserStage = useFlowStore((s) => s.syncFromUserStage);
  const { handleFailedResponse } = useIneligibilityModal();
  const { data: salaryAccountsData } = useSalaryAccounts();
  const salaryAccounts = salaryAccountsData?.salaryAccounts ?? [];
  const salaryHintText = salaryAccountsData?.hintText;
  const hasSalaryAccountRules = salaryAccounts.length > 0;
  const shouldShowSalaryHint = hasSalaryAccountRules && Boolean(salaryHintText);

  const [showNonSalaryWarning, setShowNonSalaryWarning] = useState(false);
  const [showBankConfirmation, setShowBankConfirmation] = useState(false);
  // Holds the validated form data while the non-salary warning is on screen.
  // Continue re-submits this snapshot instead of forcing the user to re-tap
  // the form's primary CTA after acknowledging the warning.
  const pendingSubmitRef = useRef<BankDetailsFormData | null>(null);

  const { submit, isPending, errorMessage, clearError } =
    useRegistrationSubmit<BankDetailsFormData>({
      mutationFn: submitBankDetails,
      onSuccess: () => {
        setShowNonSalaryWarning(false);
        pendingSubmitRef.current = null;
        void logAnalyticsEvent(ANALYTICS_EVENT.BANK_DETAIL_PAGE_SUBMIT);
        void handleRegistrationStepSuccess({
          currentStage,
          onNext,
          syncFromUserStage,
        });
      },
      onFailedResponse: handleFailedResponse,
    });

  const { control, handleSubmit, setValue, getValues, watch } = useForm<BankDetailsFormData>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      accountNumber: appConfig.prefillPersonalWithPiyushData ? '025301533944' : '',
      confirmAccountNumber: appConfig.prefillPersonalWithPiyushData ? '025301533944' : '',
      accountHolderName: appConfig.prefillPersonalWithPiyushData ? 'Piyush Beli' : '',
      accountType: 'Saving',
      ifscCode: appConfig.prefillPersonalWithPiyushData ? 'ICIC0004302' : '',
      bankName: appConfig.prefillPersonalWithPiyushData ? 'ICICI Bank' : '',
      branchName: appConfig.prefillPersonalWithPiyushData ? 'Muhana Mandi' : '',
    },
  });

  // Refs for scroll view and keyboard next-field navigation.
  // Chain: accountNumber → confirmAccountNumber → accountHolderName → ifscCode → bankName → branchName (done)
  // accountType is a dropdown so it is skipped in the keyboard chain.
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
  const accountNumberRef = useRef<TextInput>(null);
  const confirmAccountNumberRef = useRef<TextInput>(null);
  const accountHolderNameRef = useRef<TextInput>(null);
  const ifscCodeRef = useRef<TextInput>(null);
  const bankNameRef = useRef<TextInput>(null);
  const branchNameRef = useRef<TextInput>(null);

  const bankFieldRefs = useMemo(
    () => ({
      accountNumber: accountNumberRef,
      confirmAccountNumber: confirmAccountNumberRef,
      accountHolderName: accountHolderNameRef,
      ifscCode: ifscCodeRef,
      bankName: bankNameRef,
      branchName: branchNameRef,
    }),
    []
  );
  const onValidationError = useScrollToFirstError<BankDetailsFormData>(
    BANK_FIELD_ORDER,
    bankFieldRefs,
    scrollViewRef as React.RefObject<ScrollViewScrollToFocusedInput | null>
  );

  const [lookupStatus, setLookupStatus] = useState<IfscLookupStatus>('idle');
  const lastResolvedIfsc = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const runIfscLookup = async (currentValue: string) => {
    const normalized = currentValue?.trim().toUpperCase() ?? '';
    if (!isValidIfscFormat(normalized)) return;
    if (normalized === lastResolvedIfsc.current) return;
    setLookupStatus('loading');
    const outcome = await lookupIfsc(normalized);
    if (!isMountedRef.current) return;
    if (outcome.status === 'success') {
      setValue('bankName', outcome.data.bankName);
      setValue('branchName', outcome.data.branchName);
      lastResolvedIfsc.current = normalized;
      setLookupStatus('success');
    } else {
      setLookupStatus(outcome.status);
    }
  };

  const handleIfscBlur = (currentValue: string) => {
    void runIfscLookup(currentValue);
  };

  const handleIfscChange = (newValue: string, onChange: (v: string) => void) => {
    const upper = newValue.toUpperCase();
    onChange(upper);
    if (lastResolvedIfsc.current && upper !== lastResolvedIfsc.current) {
      setLookupStatus('stale');
      lastResolvedIfsc.current = null;
    }
  };

  const handleSearchIfsc = () => {
    const ifsc = getValues('ifscCode');
    void runIfscLookup(ifsc ?? '');
  };

  const handleAccountNumberNext = () => {
    confirmAccountNumberRef.current?.focus();
  };

  const handleConfirmAccountNumberNext = () => {
    accountHolderNameRef.current?.focus();
  };

  const handleAccountHolderNameNext = () => {
    ifscCodeRef.current?.focus();
  };

  const handleIfscCodeNext = () => {
    bankNameRef.current?.focus();
  };

  const handleBankNameNext = () => {
    branchNameRef.current?.focus();
  };

  const proceedWithSubmit = (data: BankDetailsFormData) => {
    clearError();
    submit(data);
  };

  const onSubmit = (data: BankDetailsFormData) => {
    if (lookupStatus === 'stale') {
      return;
    }

    clearError();
    pendingSubmitRef.current = data;
    setShowBankConfirmation(true);
  };

  const handleEditBankDetails = () => {
    pendingSubmitRef.current = null;
    setShowBankConfirmation(false);
  };

  const handleConfirmBankDetails = () => {
    const data = pendingSubmitRef.current;
    if (!data) return;

    setShowBankConfirmation(false);

    if (hasSalaryAccountRules) {
      const isSalaryMatch = isEnteredAccountSalaryMatch(
        data.accountNumber,
        salaryAccounts
      );
      if (!isSalaryMatch) {
        // Clear any stale submit error first; the effect below auto-dismisses
        // the modal on a fresh error, and we don't want a leftover message
        // to close the modal the instant we open it.
        setShowNonSalaryWarning(true);
        return;
      }
    }

    proceedWithSubmit(data);
  };

  const handleChangeAccount = () => {
    pendingSubmitRef.current = null;
    setShowNonSalaryWarning(false);
    accountNumberRef.current?.focus();
  };

  const handleConfirmNonSalary = () => {
    const data = pendingSubmitRef.current;
    if (!data) return;
    // Keep the modal mounted so the user sees the loading state; closing on
    // success/error is handled in onSuccess and the error-driven effect below.
    proceedWithSubmit(data);
  };

  // If submitting from the non-salary modal surfaces an inline error,
  // dismiss the modal so the user can see the error banner under the form.
  React.useEffect(() => {
    if (errorMessage && showNonSalaryWarning) {
      setShowNonSalaryWarning(false);
      pendingSubmitRef.current = null;
    }
  }, [errorMessage, showNonSalaryWarning]);

  const ifscCodeValue = watch('ifscCode');
  const isSearchDisabled = !isValidIfscFormat(ifscCodeValue ?? '');

  const ifscStatusStyle =
    lookupStatus === 'success'
      ? styles.helperTextSuccess
      : lookupStatus === 'invalid' || lookupStatus === 'stale'
        ? styles.helperTextError
        : lookupStatus === 'unavailable'
          ? styles.helperTextWarning
          : undefined;

  return (
    <>
      <FormLayout
        showContactSupport
        ref={scrollViewRef}
        safeAreaEdges={['bottom']}
        keyboardAwareFooter
        onBack={onPrev}
        footer={
          <>
            <ConsentNotice
              hideLockIcon={true}
              text="This account will only be used to credit your loan"
            />
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
              Confirm & Continue
            </Button>
          </>
        }
      >
        <AppText style={styles.title} variant="h4" weight="semiBold">
          Bank Details Verification
        </AppText>
        <View style={styles.content}>
          <View style={styles.accountNumberBlock}>
            <ControlledInput
              control={control}
              name="accountNumber"
              label="Bank Account Number"
              labelWeight="semiBold"
              placeholder="Your bank account number"
              keyboardType="number-pad"
              maxLength={18}
              required
              inputRef={accountNumberRef}
              returnKeyType="next"
              onSubmitEditing={handleAccountNumberNext}
            />
            {shouldShowSalaryHint ? (
              <SalaryAccountHintText salaryAccountSuffixes={salaryAccounts} />
            ) : null}
          </View>
          <ControlledInput
            control={control}
            name="confirmAccountNumber"
            label="Confirm Bank Account Number"
            labelWeight="semiBold"
            placeholder="Re-enter your account number"
            keyboardType="number-pad"
            maxLength={18}
            required
            inputRef={confirmAccountNumberRef}
            returnKeyType="next"
            onSubmitEditing={handleConfirmAccountNumberNext}
            // Force manual re-entry: block clipboard paste, OS autofill, and
            // the iOS long-press copy/paste menu on this confirmation field.
            blockBulkInsert
            contextMenuHidden
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
          <ControlledInput
            control={control}
            name="accountHolderName"
            label="Account Holder Name"
            labelWeight="semiBold"
            placeholder="Name as on bank account"
            autoCapitalize="words"
            required
            inputRef={accountHolderNameRef}
            returnKeyType="next"
            onSubmitEditing={handleAccountHolderNameNext}
          />
          <ControlledDropdown
            control={control}
            name="accountType"
            label="Bank Account Type"
            labelWeight="semiBold"
            options={ACCOUNT_TYPE_OPTIONS}
            placeholder="Select account type"
            required
          />
          <View style={styles.ifscBlock}>
            <Controller
              control={control}
              name="ifscCode"
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <FormInput
                  label="IFSC Code"
                  labelWeight="semiBold"
                  value={value ?? ''}
                  onChangeText={(text) => handleIfscChange(text, onChange)}
                  onBlur={() => {
                    onBlur();
                    handleIfscBlur(value ?? '');
                  }}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  error={error?.message}
                  required
                  inputRef={ifscCodeRef}
                  returnKeyType="next"
                  onSubmitEditing={handleIfscCodeNext}
                  rightAccessory={
                    lookupStatus === 'loading' ? (
                      <ActivityIndicator size="small" color={colors.primary.main} />
                    ) : (
                      <TouchableOpacity
                        onPress={handleSearchIfsc}
                        disabled={isSearchDisabled}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Search bank by IFSC"
                        accessibilityRole="button"
                        style={[
                          styles.searchButtonContainer,
                          isSearchDisabled && styles.searchButtonDisabled,
                        ]}
                      >
                        <AppText variant="caption" style={styles.searchButtonText}>
                          Search
                        </AppText>
                      </TouchableOpacity>
                    )
                  }
                />
              )}
            />
            <AppText
              style={[styles.helperText, ifscStatusStyle]}
              variant="caption"
            >
              {IFSC_STATUS_MESSAGES[lookupStatus]}
            </AppText>
          </View>
          <ControlledInput
            control={control}
            name="bankName"
            label="Bank Name"
            labelWeight="semiBold"
            placeholder="e.g. ICICI Bank"
            autoCapitalize="words"
            required
            inputRef={bankNameRef}
            returnKeyType="next"
            onSubmitEditing={handleBankNameNext}
          />
          <ControlledInput
            control={control}
            name="branchName"
            label="Branch Name"
            labelWeight="semiBold"
            placeholder="e.g. Indiranagar"
            autoCapitalize="words"
            required
            inputRef={branchNameRef}
            returnKeyType="done"
          />
        </View>
      </FormLayout>
      <BankDetailsConfirmationModal
        visible={showBankConfirmation}
        accountHolderName={pendingSubmitRef.current?.accountHolderName ?? ''}
        accountNumber={pendingSubmitRef.current?.accountNumber ?? ''}
        accountType={pendingSubmitRef.current?.accountType ?? 'Saving'}
        bankName={pendingSubmitRef.current?.bankName ?? ''}
        ifscCode={pendingSubmitRef.current?.ifscCode ?? ''}
        onEdit={handleEditBankDetails}
        onConfirm={handleConfirmBankDetails}
      />
      <NonSalaryAccountModal
        visible={showNonSalaryWarning}
        salaryAccountSuffixes={salaryAccounts}
        confirmLoading={isPending}
        onChangeAccount={handleChangeAccount}
        onContinue={handleConfirmNonSalary}
        onRequestClose={handleChangeAccount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  content: {
    // paddingTop: spacing.base,
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.base,
  },
  accountNumberBlock: {
    marginBottom: spacing.sm,
  },
  ifscBlock: {
    marginBottom: spacing.sm,
  },
  helperText: {
    color: colors.text.black,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
  helperTextSuccess: {
    color: colors.success.main,
  },
  helperTextError: {
    color: colors.error.main,
  },
  helperTextWarning: {
    color: colors.warning.main,
  },
  searchButtonContainer: {
    paddingHorizontal: spacing.sm,
    // paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  searchButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.text.tertiary,
    backgroundColor: colors.background.secondary,
    // backgroundColor: 'red'
  },
  searchButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
    // marginRight: spacing.sm,
  },
});

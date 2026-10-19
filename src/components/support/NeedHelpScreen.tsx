import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormLayout } from '@/src/components/FormLayout';
import { Button } from '@/src/components/Button';
import { SuccessModal } from '@/src/components/SuccessModal';
import { ErrorModal } from '@/src/components/ErrorModal';
import { HOME_ROUTE } from '@/src/services/navigation/homeNavigation';
import {
  ControlledDropdown,
  ControlledInput,
} from '@/src/components/ControlledInput';
import { NeedHelpHeader } from './NeedHelpHeader';
import { NeedHelpAttachmentField } from './NeedHelpAttachmentField';
import { usePersonalDetails } from '@/src/hooks/usePersonalDetails';
import { useAllUserLoans } from '@/src/services/loans';
import { createCustomerTicket } from '@/src/services/support';
import { useTicketFilterOptions } from '@/src/hooks/useTicketFilterOptions';
import { useSupportPrefillStore } from '@/src/store/supportPrefillStore';
import { AppText } from '@/src/components/AppText';
import { formatFullName } from '@/src/utils/profile-formatters';
import {
  getValidApplicationNumbers,
  toApplicationDropdownOptions,
} from '@/src/utils/supportApplicationOptions';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { spacing } from '@/src/theme';
import type { DocumentFile } from '@/src/utils/documentFilePicker';

const needHelpFormSchema = z.object({
  applicationNumber: z.string().trim().optional(),
  categoryId: z.string().min(1, 'Select an issue category'),
  subject: z.string().trim().min(1, 'Enter an issue subject'),
  description: z.string().trim().optional(),
});

export type NeedHelpFormValues = {
  applicationNumber?: string;
  categoryId: string;
  subject: string;
  description?: string;
};

const defaultFormValues: NeedHelpFormValues = {
  applicationNumber: undefined,
  categoryId: '',
  subject: '',
  description: '',
};

/** Stable scroll props — avoid KeyboardAwareScrollView reconfig on each keystroke. */
const NEED_HELP_SCROLL_VIEW_PROPS = {
  enableAutomaticScroll: false,
  keyboardOpeningTime: 0,
} as const;

/**
 * Native Need Help form (header + fields + submit).
 */
export function NeedHelpScreen(): React.JSX.Element {
  const router = useRouter();
  const { source, prefillId } = useLocalSearchParams<{ source?: string; prefillId?: string }>();
  const [journeyPrefill] = useState(() => {
    const prefill = useSupportPrefillStore.getState().prefill;
    return source === 'loan-journey' && prefill?.id === prefillId ? prefill : null;
  });
  useEffect(() => {
    if (journeyPrefill) useSupportPrefillStore.getState().clearPrefill(journeyPrefill.id);
  }, [journeyPrefill]);
  const filters = useTicketFilterOptions();
  const prefilled = useRef(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  const { personalDetails } = usePersonalDetails();
  const { data: loansData, isLoading: isLoansLoading, refetch } = useAllUserLoans();
  const [attachments, setAttachments] = useState<DocumentFile[]>(() => journeyPrefill?.attachment ? [journeyPrefill.attachment] : []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const showErrorModal = useCallback((message: string) => {
    setErrorModalMessage(message);
    setIsErrorModalVisible(true);
  }, []);

  const handleSuccessClose = useCallback(() => {
    setIsSuccessModalVisible(false);
    router.replace(HOME_ROUTE);
  }, [router]);

  useFocusEffect(
    React.useCallback(() => {
      if (loansData?.loans?.length === 0) {
        refetch();
      }
    }, [refetch, loansData?.loans?.length])
  );

  const { control, handleSubmit, reset, setValue, getValues } = useForm<NeedHelpFormValues>({
    resolver: zodResolver(needHelpFormSchema),
    defaultValues: { ...defaultFormValues, subject: journeyPrefill ? `Loan Journey (App) — ${journeyPrefill.screenLabel}` : '' },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const issueOptions = useMemo(
    () => (filters.data?.categories ?? []).map(category => ({
      label: category.name,
      value: category._id,
    })),
    [filters.data]
  );

  useEffect(() => {
    if (source !== 'loan-journey' || prefilled.current) return;
    const category = issueOptions.find(option => option.label.trim().toLowerCase() === 'loan journey (app)');
    if (!category) return;
    if (!getValues('categoryId')) setValue('categoryId', category.value);
    prefilled.current = true;
  }, [source, issueOptions, getValues, setValue]);

  const issuesUnavailable = filters.isPending || filters.isError || issueOptions.length === 0;
  const issuePlaceholder = filters.isPending ? 'Loading issues...' : 'Select an issue category';
  let issueFeedback = null;
  if (!filters.isPending && (filters.isError || issueOptions.length === 0)) {
    issueFeedback = (
      <View>
        <AppText>Unable to load support issues. Please try again.</AppText>
        <Button onPress={() => { void filters.refetch(); }} disabled={filters.isFetching}>
          Retry
        </Button>
      </View>
    );
  }

  const applicationOptions = useMemo(
    () => toApplicationDropdownOptions(getValidApplicationNumbers(loansData?.loans)),
    [loansData?.loans]
  );

  const showApplicationDropdown =
    !isLoansLoading && applicationOptions.length > 0;

  const greetingFirstName = useMemo(() => {
    const fromField = personalDetails?.firstName?.trim();
    if (fromField) return fromField;
    const full = formatFullName(
      personalDetails?.firstName,
      personalDetails?.middleName,
      personalDetails?.lastName
    );
    if (!full || full === 'N/A') return undefined;
    const first = full.split(/\s+/)[0]?.trim();
    return first || undefined;
  }, [personalDetails]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const fixedHeader = useMemo(
    () => (
      <NeedHelpHeader
        greetingFirstName={greetingFirstName}
        onBack={handleBack}
      />
    ),
    [greetingFirstName, handleBack]
  );

  const submitTicket = async (data: NeedHelpFormValues) => {
    if (isSubmitting || issuesUnavailable) return;
    if (!issueOptions.some(option => option.value === data.categoryId)) {
      showErrorModal('Please select an available issue category.');
      return;
    }

    const phoneNumber = personalDetails?.phoneNumber?.trim();
    if (!phoneNumber) {
      showErrorModal(
        'Your phone number is not available. Please try again later or contact support.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const applicationNumber =
        showApplicationDropdown && data.applicationNumber?.trim()
          ? data.applicationNumber.trim()
          : undefined;

      const response = await createCustomerTicket({
        phoneNumber,
        subject: data.subject,
        description: data.description?.trim() || undefined,
        categoryId: data.categoryId,
        applicationNumber,
        files: attachments.length > 0 ? attachments : undefined,
      });

      if (!isMounted.current) return;
      if (!response.success) {
        const message =
          getApiErrorDisplayMessage(response.error) ||
          'Could not submit your request. Please try again.';
        showErrorModal(message);
        return;
      }

      reset(defaultFormValues);
      setAttachments([]);
      setIsSuccessModalVisible(true);
    } catch {
      if (!isMounted.current) return;
      showErrorModal(
        'Something went wrong. Please check your connection and try again.'
      );
    } finally {
      if (isMounted.current) setIsSubmitting(false);
    }
  };
  const onSubmit = () => { void handleSubmit(submitTicket)(); };

  const footer = (
      <Button
        variant="primary"
        size="large"
        fullWidth
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || issuesUnavailable}
        accessibilityLabel="Submit support request"
      >
        Submit
      </Button>
  );

  return (
    <>
    <FormLayout
      safeAreaEdges={['bottom']}
      fixedHeader={fixedHeader}
      keyboardAwareFooter
      showFooterBorder
      contentContainerStyle={styles.scrollContent}
      footerStyle={styles.footer}
      scrollViewProps={NEED_HELP_SCROLL_VIEW_PROPS}
      footer={footer}
    >
      <View style={styles.formBlock}>
        {showApplicationDropdown ? (
          <ControlledDropdown<NeedHelpFormValues, string>
            control={control}
            name="applicationNumber"
            label="Application Number"
            options={applicationOptions}
            placeholder="Select application number"
          />
        ) : null}
        <ControlledDropdown<NeedHelpFormValues, string>
          control={control}
          name="categoryId"
          label="Select Issue"
          options={issueOptions}
          placeholder={issuePlaceholder}
          required
        />
        {issueFeedback}
        <ControlledInput
          control={control}
          name="subject"
          label="Subject"
          placeholder="Enter an issue subject"
          required
        />
        <ControlledInput
          control={control}
          name="description"
          label="Description"
          placeholder="Please describe your concern in detail..."
          multiline
          style={styles.descriptionInput}
        />
        {journeyPrefill && !journeyPrefill.attachment && (
          <AppText>Could not capture the screen. You can attach a file below.</AppText>
        )}
        <NeedHelpAttachmentField
          files={attachments}
          onChange={setAttachments}
          disabled={isSubmitting}
        />
      </View>
    </FormLayout>
    <SuccessModal
      visible={isSuccessModalVisible}
      centered
      title="Submitted"
      message="Thank you. We have received your message and will get back to you soon."
      onClose={handleSuccessClose}
      closeLabel="OK"
    />
    <ErrorModal
      visible={isErrorModalVisible}
      title="Submission failed"
      message={errorModalMessage}
      onClose={() => setIsErrorModalVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  footer: {
    paddingHorizontal: spacing.xl,
  },
  formBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
});

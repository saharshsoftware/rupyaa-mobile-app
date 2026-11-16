import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { AppText, Button, ControlledDateInput, ControlledInput, FormLayout, PhoneInput } from '@/src/components';
import ErrorContainer from '@/src/components/ErrorContainer';
import { CreditReportLoading } from './CreditReportLoading';
import { CreditScoreAttemptsExhausted } from './CreditScoreAttemptsExhausted';
import { CreditScoreNotFound } from './CreditScoreNotFound';
import { CreditScoreReport } from './CreditScoreReport';
import { colors, spacing } from '@/src/theme';
import {
  creditScoreSchema,
  useExistingGromoEquifaxReport,
  useGromoEquifaxPull,
  type CreditScoreFormData,
} from '@/src/services/creditScore';
import {
  canAttemptCreditScorePull,
  clearCreditScoreFormDraft,
  getCreditScoreAttemptsUsed,
  getCreditScoreFormDraft,
  incrementCreditScoreAttempts,
  resetCreditScoreAttempts,
  saveCreditScoreFormDraft,
} from '@/src/services/creditScore/creditScoreAttemptService';
import { useCreditReportPdfDownload } from '@/src/services/creditScore/useCreditReportPdfDownload';
import { resolveVerifiedPhoneNumber } from '@/src/services/user/verifiedPhoneNumber';
import { useCreditReportStore } from '@/src/store/useCreditReportStore';
import { convertDdMmYyyyToIso } from '@/src/utils/common-helper';
import {
  getCreditScoreAttemptsLeft,
  hasCreditScoreAttemptsRemaining,
  isCreditScoreUnavailable,
  isRenderableCreditReport,
} from '@/src/config/creditScore';
import { useScrollToFirstError, type ScrollViewScrollToFocusedInput } from '@/src/hooks/useScrollToFirstError';
import { useLoanJourneyGuard } from '@/src/hooks/useLoanJourneyGuard';
import { envConfig } from '@/src/config/envConfig';
import type { CreditReportData, CreditScoreDetailsRequest } from '@/src/types/creditScore';

const FIELD_ORDER = ['fullName', 'panNumber', 'dob', 'email', 'monthlyIncome'] as const;

type ScreenMode = 'loading' | 'form' | 'report' | 'notFound' | 'exhausted';

/** Convert API dob (yyyy-mm-dd / ISO) to form dd/mm/yyyy. */
function convertApiDobToForm(dob: string): string {
  if (!dob) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return dob;
  const ymd = dob.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  return '';
}

function formValuesFromUnavailableReport(
  report: CreditReportData,
  current: CreditScoreFormData,
): CreditScoreFormData {
  return {
    fullName: report.consumer?.name?.trim() || current.fullName,
    panNumber: report.consumer?.pan?.trim().toUpperCase() || current.panNumber,
    dob: convertApiDobToForm(report.consumer?.dob ?? '') || current.dob,
    email: report.consumer?.email?.trim() || current.email,
    monthlyIncome: current.monthlyIncome,
    consent: true,
  };
}

export function CreditScoreForm() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { tryOpenLoanJourney } = useLoanJourneyGuard();
  const [report, setReport] = useState<CreditReportData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [sessionPhone, setSessionPhone] = useState('');
  const [screenMode, setScreenMode] = useState<ScreenMode>('loading');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptsHydrated, setAttemptsHydrated] = useState(false);
  const lastPayload = useRef<CreditScoreDetailsRequest | null>(null);
  const pullInFlightRef = useRef(false);
  const resolvedExistingRef = useRef(false);
  const lastUnavailableReportRef = useRef<CreditReportData | null>(null);
  const scrollRef = useRef<KeyboardAwareScrollView>(null);
  const fullNameRef = useRef<TextInput>(null); const panRef = useRef<TextInput>(null);
  const dobRef = useRef<TextInput>(null); const emailRef = useRef<TextInput>(null); const incomeRef = useRef<TextInput>(null);
  const fieldRefs = useMemo(() => ({ fullName: fullNameRef, panNumber: panRef, dob: dobRef, email: emailRef, monthlyIncome: incomeRef }), []);
  const onValidationError = useScrollToFirstError([...FIELD_ORDER], fieldRefs, scrollRef as React.RefObject<ScrollViewScrollToFocusedInput | null>);
  const existing = useExistingGromoEquifaxReport();
  const pull = useGromoEquifaxPull();
  const pdf = useCreditReportPdfDownload(pdfUrl);
  const setReportSession = useCreditReportStore((state) => state.setReportSession);
  const displayedPhone = sessionPhone.length === 10
    ? `${sessionPhone.slice(0, 5)} ${sessionPhone.slice(5)}`
    : sessionPhone;
  const { control, handleSubmit, reset, getValues, formState: { isValid } } = useForm<CreditScoreFormData>({
    resolver: zodResolver(creditScoreSchema), mode: 'onChange',
    defaultValues: {
      fullName: envConfig.isDevelopment ? 'Piyush Beli' : '',
      panNumber: envConfig.isDevelopment ? 'ABCDE1234F' : '',
      dob: envConfig.isDevelopment ? '01/01/1990' : '',
      email: envConfig.isDevelopment ? 'test@test.com' : '',
      monthlyIncome: envConfig.isDevelopment ? '10000' : '',
      consent: true,
    },
  });
  const formError = submitError || pull.error?.message || existing.error?.message || '';
  const isCheckingExisting =
    existing.isPending || (!existing.isFetched && existing.fetchStatus !== 'paused');
  const showingReport = screenMode === 'report';
  const headerUsesPrimary = screenMode === 'notFound' || screenMode === 'exhausted';
  const attemptsLeft = getCreditScoreAttemptsLeft(attemptsUsed);

  const prefillFromSources = useCallback(async (data?: CreditReportData | null) => {
    const draft = await getCreditScoreFormDraft();
    const current = getValues();
    const source = data ?? lastUnavailableReportRef.current;
    const fromReport = source ? formValuesFromUnavailableReport(source, current) : null;
    reset({
      fullName: fromReport?.fullName || draft?.fullName || current.fullName,
      panNumber: fromReport?.panNumber || draft?.panNumber || current.panNumber,
      dob: fromReport?.dob || draft?.dob || current.dob,
      email: fromReport?.email || draft?.email || current.email,
      monthlyIncome: draft?.monthlyIncome || current.monthlyIncome,
      consent: true,
    });
  }, [getValues, reset]);

  const openUnavailableScreen = useCallback((used: number) => {
    setReport(null);
    setPdfUrl(null);
    if (hasCreditScoreAttemptsRemaining(used)) {
      setScreenMode('notFound');
      return;
    }
    setScreenMode('exhausted');
  }, []);

  // Report has its own header; form/retry states use the stack header for back.
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({
      headerShown: !showingReport,
      headerTitle: () => null,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerLeft}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text.black} />
          <AppText variant="bodyLarge" weight="bold" color="black">
            {t('Credit Score')}
          </AppText>
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: headerUsesPrimary ? colors.primary.main : colors.background.primary,
      },
      headerShadowVisible: false,
    });
    return () => {
      parent?.setOptions({ headerShown: false });
    };
  }, [headerUsesPrimary, navigation, router, showingReport, t]);

  useEffect(() => {
    void resolveVerifiedPhoneNumber().then(setSessionPhone);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const used = await getCreditScoreAttemptsUsed();
      if (cancelled) return;
      setAttemptsUsed(used);
      setAttemptsHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve existing report once after attempts hydrate — do not re-force retry screens on later edits.
  useEffect(() => {
    if (!attemptsHydrated || isCheckingExisting || resolvedExistingRef.current) return;
    resolvedExistingRef.current = true;
    const result = existing.data;

    if (result?.reportAvailable && result.data) {
      if (isCreditScoreUnavailable(result.data.creditScore)) {
        lastUnavailableReportRef.current = result.data;
        void prefillFromSources(result.data);
        openUnavailableScreen(attemptsUsed);
        return;
      }
      if (isRenderableCreditReport(result.data)) {
        void resetCreditScoreAttempts().then(() => setAttemptsUsed(0));
        setSubmitError('');
        setReport(result.data);
        setPdfUrl(result.pdfUrl?.trim() || null);
        setScreenMode('report');
        return;
      }
    }

    if (!hasCreditScoreAttemptsRemaining(attemptsUsed)) {
      setScreenMode('exhausted');
      return;
    }

    setScreenMode('form');
  }, [
    attemptsHydrated,
    attemptsUsed,
    existing.data,
    isCheckingExisting,
    openUnavailableScreen,
    prefillFromSources,
  ]);

  const applyResult = async (
    result: Awaited<ReturnType<typeof pull.mutateAsync>>,
  ) => {
    if (!result.reportAvailable || !result.data) {
      setSubmitError(result.message || 'Your credit report is unavailable. Please try again.');
      setScreenMode('form');
      return;
    }

    if (isCreditScoreUnavailable(result.data.creditScore)) {
      lastUnavailableReportRef.current = result.data;
      const used = await incrementCreditScoreAttempts();
      setAttemptsUsed(used);
      await prefillFromSources(result.data);
      openUnavailableScreen(used);
      return;
    }

    if (!isRenderableCreditReport(result.data)) {
      setSubmitError(result.message || 'Your credit report is unavailable. Please try again.');
      setScreenMode('form');
      return;
    }

    await resetCreditScoreAttempts();
    await clearCreditScoreFormDraft();
    lastUnavailableReportRef.current = null;
    setAttemptsUsed(0);
    setSubmitError('');
    setReport(result.data);
    setPdfUrl(result.pdfUrl?.trim() || null);
    setScreenMode('report');
  };

  const onSubmit = async (values: CreditScoreFormData) => {
    if (pullInFlightRef.current || pull.isPending) return;
    setSubmitError('');

    const allowed = await canAttemptCreditScorePull();
    if (!allowed) {
      const used = await getCreditScoreAttemptsUsed();
      setAttemptsUsed(used);
      setScreenMode('exhausted');
      return;
    }

    const phone = await resolveVerifiedPhoneNumber();
    if (!phone) {
      setSubmitError('Your verified phone number could not be found. Please sign in again and retry.');
      return;
    }

    const payload: CreditScoreDetailsRequest = {
      fullName: values.fullName.trim(),
      panNumber: values.panNumber.toUpperCase().replace(/\s/g, ''),
      dob: convertDdMmYyyyToIso(values.dob),
      mobileNumber: phone,
      consent: values.consent,
    };
    lastPayload.current = payload;
    await saveCreditScoreFormDraft(values);

    pullInFlightRef.current = true;
    try {
      await applyResult(await pull.mutateAsync(payload));
    } catch {
      setScreenMode('form');
    } finally {
      pullInFlightRef.current = false;
    }
  };

  const handleEditAndRetry = () => {
    void prefillFromSources(lastUnavailableReportRef.current);
    setSubmitError('');
    setScreenMode('form');
  };

  const handleApplyForLoan = () => {
    tryOpenLoanJourney(() => router.push('/loan-journey'));
  };

  const handleTalkToSupport = () => {
    router.push('/need-help');
  };

  const handleBackToHome = () => {
    router.replace('/(tabs)/home');
  };

  if (screenMode === 'report' && isRenderableCreditReport(report) && !isCreditScoreUnavailable(report.creditScore)) {
    return (
      <CreditScoreReport
        report={report}
        onBack={() => router.back()}
        onEligibility={() => router.push('/(tabs)/home')}
        onOpenDetailed={() => {
          setReportSession(report, pdfUrl);
          router.push('/credit-score/detailed-report');
        }}
        onDownload={pdf.download}
        downloading={pdf.isDownloading}
        downloadStatus={pdf.status}
      />
    );
  }

  if (screenMode === 'notFound') {
    return (
      <CreditScoreNotFound
        attemptsLeft={attemptsLeft}
        onEditAndRetry={handleEditAndRetry}
        onApplyForLoan={handleApplyForLoan}
      />
    );
  }

  if (screenMode === 'exhausted') {
    return (
      <CreditScoreAttemptsExhausted
        onTalkToSupport={handleTalkToSupport}
        onApplyForLoan={handleApplyForLoan}
        onBackToHome={handleBackToHome}
      />
    );
  }

  if (pull.isPending && lastPayload.current) return <CreditReportLoading />;
  if (!attemptsHydrated || isCheckingExisting || screenMode === 'loading') {
    return <CreditReportLoading />;
  }

  return (
    <FormLayout
      ref={scrollRef}
      safeAreaEdges={['bottom']}
      keyboardAwareFooter
      header={
        <>
          <View style={styles.heading}>
            <AppText variant="h3" weight="semiBold" color="black">Check your credit score</AppText>
            <AppText color="black" style={styles.subtitle}>
              Free & won’t affect your score. We just need a few details to fetch your Equifax report.
            </AppText>
          </View>
        </>
      }
      footer={(
        <>
          <ErrorContainer responseError={formError} />
          <Button
            fullWidth
            size="large"
            loading={pull.isPending}
            disabled={pull.isPending || !isValid}
            onPress={handleSubmit(onSubmit, onValidationError)}
          >
            Get my credit score
          </Button>
        </>
      )}
    >
      <View style={styles.form}>
        <ControlledInput control={control} name="fullName" label="Full Name" placeholder="As per PAN Card" required inputRef={fullNameRef} returnKeyType="next" onSubmitEditing={() => panRef.current?.focus()} />
        <ControlledInput control={control} name="panNumber" label="PAN Number" placeholder="Enter Your PAN Number" required autoCapitalize="characters" maxLength={10} inputRef={panRef} returnKeyType="next" onSubmitEditing={() => dobRef.current?.focus()} />
        <ControlledDateInput control={control} name="dob" label="Date of Birth" required inputRef={dobRef} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
        <View>
          <AppText color="black" style={styles.phoneLabel}>Phone Number</AppText>
          <PhoneInput value={displayedPhone} onChange={() => undefined} placeholder="00000 00000" editable={false} />
        </View>
        <ControlledInput control={control} name="email" label="Email Address" placeholder="name@email.com" required keyboardType="email-address" autoCapitalize="none" inputRef={emailRef} returnKeyType="next" onSubmitEditing={() => incomeRef.current?.focus()} />
        <ControlledInput control={control} name="monthlyIncome" label="Monthly Income" placeholder="00,000" required keyboardType="number-pad" leftAccessory={<AppText color="black">₹</AppText>} inputRef={incomeRef} />
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  heading: {
    paddingTop: spacing.md,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  subtitle: { lineHeight: 24, color: colors.text.black },
  form: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  phoneLabel: { fontSize: 14, marginBottom: spacing.sm },
});

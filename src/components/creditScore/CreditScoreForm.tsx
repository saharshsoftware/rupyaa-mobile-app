import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppText, Button, ControlledDateInput, ControlledInput, FormLayout, PhoneInput, RupyaaLogo, ScreenBackground } from '@/src/components';
import ErrorContainer from '@/src/components/ErrorContainer';
import { CreditReportLoading, CreditScoreReport, CreditScoreUnavailable } from '@/src/components/creditScore';
import { colors, spacing } from '@/src/theme';
import { creditScoreSchema, useExistingGromoEquifaxReport, useGromoEquifaxPull, type CreditScoreFormData } from '@/src/services/creditScore';
import { useCreditReportPdfDownload } from '@/src/services/creditScore/useCreditReportPdfDownload';
import { resolveVerifiedPhoneNumber } from '@/src/services/user/verifiedPhoneNumber';
import { useCreditReportStore } from '@/src/store/useCreditReportStore';
import { convertDdMmYyyyToIso } from '@/src/utils/common-helper';
import { isCreditScoreUnavailable } from '@/src/config/creditScore';
import { useScrollToFirstError, type ScrollViewScrollToFocusedInput } from '@/src/hooks/useScrollToFirstError';
import { envConfig } from '@/src/config/envConfig';
import type { CreditReportData, CreditScoreDetailsRequest } from '@/src/types/creditScore';

const FIELD_ORDER = ['fullName', 'panNumber', 'dob', 'email', 'monthlyIncome'] as const;

export function CreditScoreForm() {
  const router = useRouter();
  const [report, setReport] = useState<CreditReportData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [sessionPhone, setSessionPhone] = useState('');
  const lastPayload = useRef<CreditScoreDetailsRequest | null>(null);
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
  const { control, handleSubmit, formState: { isValid } } = useForm<CreditScoreFormData>({
    resolver: zodResolver(creditScoreSchema), mode: 'onChange',
    defaultValues: { fullName: envConfig.isDevelopment ? 'Piyush Beli' : '', panNumber: envConfig.isDevelopment ? 'ABCDE1234F' : '', dob: envConfig.isDevelopment ? '01/01/1990' : '', email: envConfig.isDevelopment ? 'test@test.com' : '', monthlyIncome: envConfig.isDevelopment ? '10000' : '', consent: true },
  });

  useEffect(() => {
    void resolveVerifiedPhoneNumber().then(setSessionPhone);
  }, []);

  useEffect(() => {
    const result = existing.data;
    if (result?.reportAvailable && result.data) {
      setReport(result.data); setPdfUrl(result.pdfUrl?.trim() || null);
    }
  }, [existing.data]);

  const applyResult = (result: Awaited<ReturnType<typeof pull.mutateAsync>>) => {
    if (!result.reportAvailable || !result.data) { setSubmitError(result.message || 'Your credit report is unavailable. Please try again.'); return; }
    setSubmitError(''); setReport(result.data); setPdfUrl(result.pdfUrl?.trim() || null);
  };

  const onSubmit = async (values: CreditScoreFormData) => {
    setSubmitError('');
    const phone = await resolveVerifiedPhoneNumber();
    if (!phone) { setSubmitError('Your verified phone number could not be found. Please sign in again and retry.'); return; }
    const payload: CreditScoreDetailsRequest = { fullName: values.fullName.trim(), panNumber: values.panNumber.toUpperCase().replace(/\s/g, ''), dob: convertDdMmYyyyToIso(values.dob), mobileNumber: phone, consent: values.consent };
    lastPayload.current = payload;
    try { applyResult(await pull.mutateAsync(payload)); } catch { /* mutation error renders below */ }
  };

  const retry = async () => {
    try {
      const result = lastPayload.current ? await pull.mutateAsync(lastPayload.current) : (await existing.refetch()).data;
      if (result) applyResult(result); else { setReport(null); setPdfUrl(null); }
    } catch { /* mutation error renders below */ }
  };

  if (report && isCreditScoreUnavailable(report.creditScore)) return <CreditScoreUnavailable onRetry={retry} loading={pull.isPending || existing.isFetching} />;
  if (report) return <CreditScoreReport report={report} onBack={() => router.back()} onEligibility={() => router.push('/(tabs)/home')} onOpenDetailed={() => { setReportSession(report, pdfUrl); router.push('/credit-score/detailed-report'); }} onDownload={pdf.download} downloading={pdf.isDownloading} downloadStatus={pdf.status} />;
  if (pull.isPending && lastPayload.current) return <CreditReportLoading />;
  if (!existing.isFetched && existing.fetchStatus !== 'paused') return <CreditReportLoading />;

  return <ScreenBackground><FormLayout ref={scrollRef} keyboardAwareFooter
    header={<><RupyaaLogo size="sm" style={styles.logo} /><View style={styles.heading}><AppText variant="h3" weight="semiBold" color="black">Check your credit score</AppText><AppText color="black" style={styles.subtitle}>Free & won’t affect your score. We just need a few details to fetch your Equifax report.</AppText></View></>}
    footer={<><ErrorContainer responseError={submitError || pull.error?.message || ''} /><Button fullWidth size="large" loading={pull.isPending} disabled={pull.isPending || !isValid} onPress={handleSubmit(onSubmit, onValidationError)}>Get my credit score</Button></>}>
    <View style={styles.form}>
      <ControlledInput control={control} name="fullName" label="Full Name" placeholder="As per PAN Card" required inputRef={fullNameRef} returnKeyType="next" onSubmitEditing={() => panRef.current?.focus()} />
      <ControlledInput control={control} name="panNumber" label="PAN Number" placeholder="Enter Your PAN Number" required autoCapitalize="characters" maxLength={10} inputRef={panRef} returnKeyType="next" onSubmitEditing={() => dobRef.current?.focus()} />
      <ControlledDateInput control={control} name="dob" label="Date of Birth" required inputRef={dobRef} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
      <View><AppText color="black" style={styles.phoneLabel}>Phone Number</AppText><PhoneInput value={displayedPhone} onChange={() => undefined} placeholder="00000 00000" editable={false} /></View>
      <ControlledInput control={control} name="email" label="Email Address" placeholder="name@email.com" required keyboardType="email-address" autoCapitalize="none" inputRef={emailRef} returnKeyType="next" onSubmitEditing={() => incomeRef.current?.focus()} />
      <ControlledInput control={control} name="monthlyIncome" label="Monthly Income" placeholder="00,000" required keyboardType="number-pad" leftAccessory={<AppText color="black">₹</AppText>} inputRef={incomeRef} />
    </View>
  </FormLayout></ScreenBackground>;
}

const styles = StyleSheet.create({
  logo: { marginTop: spacing['4xl'], marginLeft: spacing.md, marginBottom: spacing.xl },
  heading: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  subtitle: { lineHeight: 24, color: colors.text.black },
  form: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  phoneLabel: { fontSize: 14, marginBottom: spacing.sm },
});

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Banknote, ChevronRight, CreditCard } from 'lucide-react-native';
import { AppText, Button } from '@/src/components';
import type { EmiPaymentContentProps } from '@/src/types';
import { colors, radius, spacing, typography } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';
import { buildEmiScheduleItems } from '@/src/utils/emi-presentation';
import { formatLoanDueDate, getEmiPaymentDecision, resolveForeclosureTotalPayable } from '@/src/utils/loan-helpers';
import { EmiRepaymentAccordion } from './EmiRepaymentAccordion';

interface SummaryMetricProps { label: string; value: string; }
function SummaryMetric({ label, value }: SummaryMetricProps) {
  return <View style={styles.metric}>
    <AppText variant="caption" style={styles.metricLabel}>{label}</AppText>
    <AppText variant="bodyLarge" weight="bold" style={styles.metricValue}>{value}</AppText>
  </View>;
}

export function EmiPaymentContent({ loan, onPayPress, onForeclosePress, ctaLoading = false, ctaError }: EmiPaymentContentProps) {
  const summary = loan.emiRepayment?.summary;
  const decision = getEmiPaymentDecision(loan);
  const items = buildEmiScheduleItems(loan);
  const progress = summary && summary.totalPayable > 0 ? Math.min(1, Math.max(0, summary.totalPaid / summary.totalPayable)) : 0;
  const closed = loan.emiRepayment?.isClosed || decision.state === 'all_paid' || decision.state === 'foreclosed';
  const disabled = closed || ctaLoading || decision.disabled || decision.nextActionBlock?.isLocked === true;
  const scheduleKey = `${loan._id}:${items.find((item) => item.defaultExpanded)?.id ?? 'none'}`;
  const progressMarkers = items.slice(1).map((item, index) => (
    <View key={item.id} style={[styles.progressMarker, { left: `${((index + 1) / items.length) * 100}%` }]} />
  ));
  let summaryNode: React.ReactNode = null;
  if (summary) {
    const nextDue = summary.nextDueDate ? formatLoanDueDate(summary.nextDueDate) : '—';
    summaryNode = <View style={styles.summary}>
      <AppText variant="caption" weight="semiBold" style={styles.summaryTitle}>{`Loan amount ${formatCurrency(summary.loanAmount, true)} · ${summary.tenureMonths}-month plan`}</AppText>
      <View style={styles.row}>
        <SummaryMetric label="Total payable" value={formatCurrency(summary.totalPayable, true)} />
        <SummaryMetric label="Monthly EMI" value={formatCurrency(summary.monthlyEmi, true)} />
      </View>
      <View style={styles.row}>
        <SummaryMetric label="EMIs paid" value={`${summary.emisPaid} of ${summary.totalEmis}`} />
        <SummaryMetric label="Next due" value={nextDue} />
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
        {progressMarkers}
      </View>
      <View style={styles.progressRow}>
        <AppText variant="captionSmall" weight="semiBold" style={styles.progressLabel}>{`${formatCurrency(summary.totalPaid, true)} paid`}</AppText>
        <AppText variant="captionSmall" weight="semiBold" style={styles.progressLabelRight}>{`${formatCurrency(summary.remaining, true)} remaining`}</AppText>
      </View>
    </View>;
  }
  let options: React.ReactNode = null;
  if (!closed) {
    const foreclosureDisabled = ctaLoading || resolveForeclosureTotalPayable(loan) <= 0;
    options = <>
      <AppText variant="body" weight="semiBold" style={styles.sectionTitle}>Want to close early?</AppText>
      <Pressable accessibilityRole="button" disabled={foreclosureDisabled} onPress={onForeclosePress} style={styles.option}>
        <View style={styles.iconWell}>
          <Banknote size={18} color={colors.primary.main} />
        </View>
        <View style={styles.optionCopy}>
          <AppText variant="caption" weight="semiBold" style={styles.optionTitle}>Foreclose loan</AppText>
          <AppText variant="captionExtraSmall" style={styles.optionSubtitle}>Pay all remaining dues and close in one go</AppText>
        </View>
        <ChevronRight size={18} color={colors.text.secondary} />
      </Pressable>
    </>;
  }
  let schedule: React.ReactNode = <AppText variant="body" style={styles.optionTitle}>Your EMI schedule is not available yet.</AppText>;
  if (items.length > 0) {
    schedule = <EmiRepaymentAccordion key={scheduleKey} title="Your EMI schedule" items={items} />;
  }
  let errorNode: React.ReactNode = null;
  if (ctaError) errorNode = <AppText variant="caption" color="error" accessibilityRole="alert">{ctaError}</AppText>;
  const footerLabel = closed ? 'Loan repayment completed' : decision.footerLabel;
  return <View style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>{summaryNode}{schedule}{options}</ScrollView>
    <View style={styles.footer}>{errorNode}<AppText variant="body" weight="semiBold" style={styles.footerLabel}>{footerLabel}</AppText>
      <Button title={`Pay ${formatCurrency(decision.amount, true)}`} size="large" leftIcon={<CreditCard size={20} color={colors.text.primary} />} onPress={() => onPayPress(decision.amount)} disabled={disabled} loading={ctaLoading} fullWidth />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.md },
  summary: { backgroundColor: colors.primary.main, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, marginBottom: spacing.sm },
  summaryTitle: { color: colors.text.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  metric: { flex: 1, gap: spacing.xs },
  metricLabel: { color: colors.text.secondary },
  metricValue: { color: colors.text.black, lineHeight: typography.fontSize.lg * typography.lineHeight.tight },
  track: { height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.background.primary, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: colors.text.black, borderRadius: radius.full },
  progressMarker: { position: 'absolute', top: 0, bottom: 0, width: spacing.xs, marginLeft: -spacing.xs / 2, borderRadius: radius.full, backgroundColor: colors.primary.contrast },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  progressLabel: { color: colors.text.secondary },
  progressLabelRight: { color: colors.text.secondary, textAlign: 'right' },
  sectionTitle: { marginTop: spacing.base, marginBottom: spacing.sm, color: colors.text.primary },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.primary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.light, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  iconWell: { width: spacing['2xl'], height: spacing['2xl'], borderRadius: radius.md, backgroundColor: colors.primary.lightest, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1, gap: spacing.xs },
  optionTitle: { color: colors.text.primary },
  optionSubtitle: { color: colors.text.secondary },
  footer: { marginHorizontal: -spacing.base, paddingHorizontal: spacing.base, paddingTop: spacing.base, paddingBottom: spacing.base, gap: spacing.md, backgroundColor: colors.background.primary, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], borderTopWidth: 1, borderTopColor: colors.border.light },
  footerLabel: { color: colors.error.overdue },
});

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { AppText, Button } from '@/src/components';
import { colors, radius, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';
import { getApplicationDisplay } from '@/src/utils/loan-formatters';
import type { ForeclosureCardProps } from './ForeclosureCard';

interface DetailRowProps { label: string; value: string; }
function DetailRow({ label, value }: DetailRowProps) {
  return <View style={styles.row}>
    <AppText variant="caption" style={styles.rowLabel}>{label}</AppText>
    <AppText variant="caption" style={styles.rowValue}>{value}</AppText>
  </View>;
}

function formatFinalAmount(amount: number | undefined): string {
  const value = amount ?? 0;
  const formatted = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `₹ ${formatted}`;
}

export function EmiForeclosureCard({ loan, foreclosureAmount, onForeclosePress, ctaLoading = false, ctaError }: ForeclosureCardProps) {
  const summary = loan.emiRepayment?.summary;
  const breakdown = loan.emiRepayment?.foreclosure;
  const money = (amount: number | undefined) => formatCurrency(amount ?? 0, true);
  const gst = breakdown == null ? 0 : breakdown.gstOnForeclosureFee + breakdown.gstOnPenal + breakdown.gstOnBounce;
  const statusLabel = (loan.status ?? '').trim();
  const isOverdue = statusLabel.toLowerCase() === 'overdue';
  let errorNode: React.ReactNode = null;
  if (ctaError) errorNode = <AppText variant="caption" color="error" accessibilityRole="alert">{ctaError}</AppText>;
  let statusNode: React.ReactNode = null;
  if (statusLabel.length > 0) {
    statusNode = <View style={[styles.badge, isOverdue ? styles.badgeOverdue : styles.badgeNeutral]}>
      <AppText variant="captionExtraSmall" weight="bold" style={styles.badgeText}>{statusLabel.toUpperCase()}</AppText>
    </View>;
  }
  const disabled = ctaLoading || !breakdown || foreclosureAmount <= 0 || loan.emiRepayment?.isClosed === true;
  return <View style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.application}>
        <AppText variant="caption" weight="medium" style={styles.applicationId}>{getApplicationDisplay(loan)}</AppText>
        {statusNode}
      </View>
      <DetailRow label="Loan Amount" value={money(summary?.loanAmount ?? loan.amount)} />
      <DetailRow label="Tenure Plan" value={summary ? `${summary.tenureMonths} months` : '—'} />
      <DetailRow label="EMI Paid" value={summary ? `${summary.emisPaid} of ${summary.totalEmis}` : '—'} />
      <DetailRow label="Outstanding Principal" value={money(breakdown?.outstandingPrincipal)} />
      <DetailRow label="Interest till closure date" value={money(breakdown?.interestTillClosure)} />
      <DetailRow label="Penal charge (only if applicable)" value={money(breakdown?.penalCharge)} />
      <DetailRow label="Bounce charge (only if applicable)" value={money(breakdown?.bounceCharge)} />
      <DetailRow label="Foreclosure fee" value={money(breakdown?.foreclosureFee)} />
      <DetailRow label="GST on charges" value={money(gst)} />
      <View style={styles.total}>
        <AppText variant="caption" weight="bold" style={styles.totalLabel}>Final foreclosure amount</AppText>
        <AppText variant="caption" weight="bold" style={styles.totalValue}>{formatFinalAmount(breakdown?.total ?? foreclosureAmount)}</AppText>
      </View>
    </ScrollView>
    <View style={styles.footer}>{errorNode}
      <Button title={`Pay ${formatCurrency(foreclosureAmount, true)}`} leftIcon={<CreditCard size={18} color={colors.text.primary} />} onPress={onForeclosePress} disabled={disabled} loading={ctaLoading} fullWidth />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { paddingBottom: spacing.xl },
  application: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: colors.background.cream, borderWidth: 1, borderColor: colors.border.light, borderRadius: radius.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.md, marginBottom: spacing.lg },
  applicationId: { flex: 1, color: colors.text.primary },
  badge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeOverdue: { backgroundColor: colors.error.overdue },
  badgeNeutral: { backgroundColor: colors.text.secondary },
  badgeText: { color: colors.text.inverse },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm },
  rowLabel: { flex: 1, color: colors.text.gray },
  rowValue: { color: colors.text.primary, textAlign: 'right' },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderWidth: 1, borderColor: colors.primary.main, borderRadius: radius.lg, backgroundColor: colors.background.cream, paddingHorizontal: spacing.base, paddingVertical: spacing.md, marginTop: spacing.md },
  totalLabel: { flex: 1, color: colors.text.primary },
  totalValue: { color: colors.text.primary },
  footer: { paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm, backgroundColor: colors.background.primary },
});

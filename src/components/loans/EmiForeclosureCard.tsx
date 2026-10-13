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

function isPresentAmount(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pushAmountRow(rows: DetailRowProps[], label: string, amount: number | null | undefined): void {
  if (!isPresentAmount(amount) || amount === 0) return;
  rows.push({ label, value: formatCurrency(amount, true) });
}

function buildDetailRows(loan: ForeclosureCardProps['loan']): DetailRowProps[] {
  const summary = loan.emiRepayment?.summary;
  const breakdown = loan.emiRepayment?.foreclosure;
  const rows: DetailRowProps[] = [];
  const summaryLoanAmount = summary?.loanAmount;
  pushAmountRow(rows, 'Loan Amount', isPresentAmount(summaryLoanAmount) ? summaryLoanAmount : loan.amount);
  if (summary != null && isPresentAmount(summary.tenureMonths) && summary.tenureMonths !== 0) rows.push({ label: 'Tenure Plan', value: `${summary.tenureMonths} months` });
  if (summary != null && isPresentAmount(summary.emisPaid) && isPresentAmount(summary.totalEmis) && summary.totalEmis !== 0) rows.push({ label: 'EMI Paid', value: `${summary.emisPaid} of ${summary.totalEmis}` });
  pushAmountRow(rows, 'Outstanding Principal', breakdown?.outstandingPrincipal);
  pushAmountRow(rows, 'Interest till closure date', breakdown?.interestTillClosure);
  pushAmountRow(rows, 'Penal charge (only if applicable)', breakdown?.penalCharge);
  pushAmountRow(rows, 'Bounce charge (only if applicable)', breakdown?.bounceCharge);
  pushAmountRow(rows, 'Foreclosure fee', breakdown?.foreclosureFee);
  const gstParts = [breakdown?.gstOnForeclosureFee, breakdown?.gstOnPenal, breakdown?.gstOnBounce].filter(isPresentAmount);
  if (gstParts.length > 0) {
    const gst = gstParts.reduce((total, part) => total + part, 0);
    pushAmountRow(rows, 'GST on charges', gst);
  }
  return rows;
}

function renderDetailRows(rows: readonly DetailRowProps[]): React.ReactNode {
  return rows.map((row) => <DetailRow key={row.label} label={row.label} value={row.value} />);
}

function formatFinalAmount(amount: number | undefined): string {
  const value = amount ?? 0;
  const formatted = value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `₹ ${formatted}`;
}

export function EmiForeclosureCard({ loan, foreclosureAmount, onForeclosePress, ctaLoading = false, ctaError }: ForeclosureCardProps) {
  const breakdown = loan.emiRepayment?.foreclosure;
  const detailRows = buildDetailRows(loan);
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
      {renderDetailRows(detailRows)}
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

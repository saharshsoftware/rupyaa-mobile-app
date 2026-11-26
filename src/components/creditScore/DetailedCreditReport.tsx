import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Download } from 'lucide-react-native';
import { AppText, Button, FormLayout } from '@/src/components';
import { CreditScoreGauge } from './CreditScoreGauge';
import { colors, radius, spacing, typography } from '@/src/theme';
import type { RenderableCreditReport } from '@/src/config/creditScore';
import type { CreditAccount } from '@/src/types/creditScore';

interface Props { report: RenderableCreditReport; onBack: () => void; onDownload: () => void; downloading: boolean }
const money = (value: number | null) => `₹${Number.isFinite(value) ? (value ?? 0).toLocaleString('en-IN') : '0'}`;

function AccountCard({ account }: { account: CreditAccount }) {
  const overdue = account.status.toLowerCase().includes('past due');
  return <View style={styles.account}>
    <View style={styles.accountHeader}>
      <AppText weight="bold" color="black" style={styles.lenderName}>
        {account.lender}
      </AppText>
      <AppText
        variant="captionExtraSmall"
        weight="bold"
        align="right"
        style={[styles.accountStatus, { color: overdue ? colors.error.main : colors.success.main }]}
      >
        ● {account.status.toUpperCase()}
      </AppText>
    </View>
    <View style={styles.accountDetails}>
      <AppText variant="captionSmall" color="black" style={styles.accountType}>
        {account.type} · Limit {money(account.sanctionedAmount)}
      </AppText>
      <View style={styles.outstandingAmount}>
        <AppText variant="captionSmall" color="black" align="right">O/s</AppText>
        <AppText weight="bold" color="black" align="right">{money(account.outstandingAmount)}</AppText>
      </View>
    </View>
  </View>;
}

export function DetailedCreditReport({ report, onBack, onDownload, downloading }: Props) {
  const consumerRows = [['Name', report.consumer.name], ['PAN', report.consumer.pan], ['Date of birth', new Date(report.consumer.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })], ['Mobile', report.consumer.mobile]];
  return <View style={styles.screen}><FormLayout footer={null} safeAreaEdges={['top', 'bottom']} fixedHeader={<View style={styles.navigationHeader}><TouchableOpacity onPress={onBack} accessibilityRole="button"><ArrowLeft size={24} color={colors.text.black} /></TouchableOpacity><AppText color="black">Credit report</AppText></View>} contentContainerStyle={styles.content}>
    <View style={styles.brandHeader}>
      <View style={styles.brandTopRow}>
        <View style={styles.brandCopy}>
          <AppText variant="h1" weight="bold" style={styles.equifax}>EQUIFAX</AppText>
          <AppText variant="body" color="black" style={styles.reportSubtitle}>Credit Information Report</AppText>
        </View>
        <Button
          size="small"
          leftIcon={<Download size={19} strokeWidth={2.5} color={colors.primary.main} />}
          onPress={onDownload}
          style={styles.pdfButton}
          textStyle={styles.pdfButtonText}
        >
          PDF
        </Button>
      </View>
      <AppText variant="captionExtraSmall" color="black" style={styles.reportId}>REPORT ID: EQ-{String(report.consumer.pan).slice(-4)} · {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</AppText>
    </View>
    <View style={styles.gaugeCard}><CreditScoreGauge compact score={report.creditScore} /><View style={styles.risk}><AppText variant="captionSmall" weight="semiBold" color="black">Low risk · <AppText variant="captionSmall" weight="bold" color="success">↑ 12 pts</AppText></AppText></View></View>
    <AppText variant="captionSmall" weight="bold" color="black" style={styles.sectionTitle}>CONSUMER INFORMATION</AppText>
    {consumerRows.map(([label, value]) => <View key={label} style={styles.detailRow}><AppText variant="caption" style={styles.mutedText}>{label}</AppText><AppText variant="caption" weight="semiBold" color="black">{value}</AppText></View>)}
    <AppText variant="captionSmall" weight="bold" color="black" style={styles.sectionTitle}>ACCOUNT DETAILS</AppText>
    {report.accounts.map((account, index) => <AccountCard key={`${account.lender}-${index}`} account={account} />)}
    <AppText variant="captionSmall" weight="bold" color="black" style={styles.sectionTitle}>PAYMENT HISTORY · 12 MO</AppText>
    <View style={styles.paymentGrid}>{report.paymentHistory12Months.map((month) => <View key={month.key} style={[styles.month, { backgroundColor: month.DaysPastDue > 0 ? colors.warning.main : colors.success.main }]} />)}</View>
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.success.main }]} />
        <AppText variant="captionSmall" style={styles.mutedText}>On time</AppText>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.warning.main }]} />
        <AppText variant="captionSmall" style={styles.mutedText}>Delayed</AppText>
      </View>
    </View>
    <Button fullWidth size="large" loading={downloading} leftIcon={<Download size={18} color={colors.primary.contrast} />} onPress={onDownload} style={styles.download}>Download Report PDF</Button>
  </FormLayout></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary }, navigationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border.light }, content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  brandHeader: { backgroundColor: colors.primary.main, borderRadius: radius['2xl'], paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  brandTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brandCopy: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  equifax: { color: colors.text.black, fontFamily: Platform.select({ ios: 'Arial Black', android: 'sans-serif-black', default: typography.fontFamily.bold }), fontWeight: '900', fontStyle: 'italic', letterSpacing: -1.5 },
  reportSubtitle: { marginTop: spacing.xs },
  pdfButton: { minWidth: 86, minHeight: 44, paddingHorizontal: spacing.md, backgroundColor: colors.text.black, borderRadius: radius.md },
  pdfButtonText: { color: colors.primary.main, fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  reportId: { width: '100%', marginTop: spacing.xl, fontSize: typography.fontSize.xs, fontFamily: typography.fontFamily.semiBold, letterSpacing: 0.15 },
  gaugeCard: { alignItems: 'center', backgroundColor: '#FFFCF5', borderWidth: 1, borderColor: colors.border.light, borderRadius: radius['2xl'], paddingTop: spacing.base, paddingBottom: spacing.lg }, risk: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border.light, borderRadius: radius.full }, sectionTitle: { marginTop: spacing.xl, letterSpacing: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  account: { padding: spacing.base, borderWidth: 1, borderColor: colors.border.light, borderRadius: radius.lg, gap: spacing.md, overflow: 'hidden' },
  accountHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  lenderName: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  accountStatus: { maxWidth: '38%', flexShrink: 1 },
  accountDetails: { flexDirection: 'row', alignItems: 'flex-end' },
  accountType: { flex: 1, minWidth: 0, paddingRight: spacing.md },
  outstandingAmount: { minWidth: 56, flexShrink: 0, alignItems: 'flex-end' },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, month: { width: 44, height: 28, borderRadius: radius.sm }, legend: { flexDirection: 'row', gap: spacing.lg }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, legendDot: { width: 12, height: 12, borderRadius: radius.full }, mutedText: { color: colors.text.black }, download: { marginTop: spacing.xl },
});

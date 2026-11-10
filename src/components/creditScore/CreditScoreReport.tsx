import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Download, Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Button } from '@/src/components';
import { CreditScoreGauge } from './CreditScoreGauge';
import { colors, radius, spacing } from '@/src/theme';
import type { CreditHealthFactor, CreditReportData } from '@/src/types/creditScore';

interface Props {
  report: CreditReportData;
  onBack: () => void;
  onEligibility: () => void;
  onOpenDetailed: () => void;
  onDownload: () => void;
  downloading: boolean;
  downloadStatus?: string;
}

function compactCurrency(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1).replace('.0', '')}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function factorColor(rating: string): string {
  const key = rating.toLowerCase();
  if (key === 'excellent' || key === 'good' || key === 'low') return colors.success.main;
  if (key === 'fair') return colors.warning.main;
  return colors.error.main;
}

function HealthRow({ factor }: { factor: CreditHealthFactor }) {
  const percentage = Math.min(100, Math.max(0, factor.percentage));
  const color = factorColor(factor.rating);
  return <View style={styles.factor}>
    <View style={styles.row}><AppText variant="captionSmall" color="black">{factor.category}</AppText><AppText variant="captionSmall" style={{ color }}>{factor.rating}</AppText></View>
    <View style={styles.track}><View style={[styles.progress, { width: `${percentage}%`, backgroundColor: color }]} /></View>
  </View>;
}

export function CreditScoreReport({ report, onBack, onEligibility, onOpenDetailed, onDownload, downloading, downloadStatus }: Props) {
  const factors = Object.values(report.creditHealthBreakdown ?? {});
  const weakest = factors.reduce<CreditHealthFactor | undefined>((lowest, item) => !lowest || item.percentage < lowest.percentage ? item : lowest, undefined);
  const enquiries = Number.parseInt(report.creditHealthBreakdown?.creditEnquiries?.description ?? '', 10) || 0;
  const activeAccounts = report.creditSummary?.activeAccounts ?? 0;
  const totalCreditLimit = report.creditSummary?.totalCreditLimit ?? null;
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.primary.main, '#FFF4CE', colors.background.primary]} style={styles.hero}>
        <View style={styles.heroHeader}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.text.black} />
          </TouchableOpacity>
          <AppText variant="bodyLarge" weight="bold" color="black" style={styles.creditScoreLabel}>Credit Score</AppText>
        </View>
        <CreditScoreGauge score={report.creditScore} />
        <View style={styles.range}><AppText variant="captionExtraSmall" weight="semiBold" color="black">300</AppText><AppText variant="captionExtraSmall" color="black">● Powered by EQUIFAX</AppText><AppText variant="captionExtraSmall" weight="semiBold" color="black">900</AppText></View>
      </LinearGradient>
      <View style={styles.summaryCard}>
        <AppText variant="caption" weight="semiBold" color="black">Report summary</AppText>
        <View style={styles.metrics}>
          {[[activeAccounts, 'ACTIVE\nACCOUNTS'], [compactCurrency(totalCreditLimit), 'TOTAL\nCREDIT'], [enquiries, 'ENQUIRIES\n(6 Months)']].map(([value, label]) =>
            <View key={String(label)} style={styles.metric}><AppText variant="h4" weight="bold" color="black">{value}</AppText><AppText variant="captionExtraSmall" color="black" align="center">{label}</AppText></View>)}
        </View>
      </View>
      <View style={[styles.card, styles.offerCard]}>
        <View style={styles.badge}><AppText variant="captionExtraSmall" weight="bold" color="inverse">PRE-APPROVED FOR YOU</AppText></View>
        <AppText variant="caption" weight="semiBold" color="black">Your score unlocks an Instant loan upto ₹50,000</AppText>
        <AppText variant="captionSmall" color="black">Interest from 1.2%/month · Zero foreclosure charges · Funds in minutes.</AppText>
        <Button size="small" fullWidth onPress={onEligibility}>Check Eligibility</Button>
        <AppText variant="captionExtraSmall" color="black" align="center">ⓘ No impact on credit score</AppText>
      </View>
      <View style={[styles.card, styles.darkCard]}>
        <AppText variant="captionExtraSmall" weight="bold" color="black" style={styles.whiteBadge}>FULL REPORT</AppText>
        <AppText variant="bodyLarge" weight="semiBold" color="inverse">Unlock your detailed{`\n`}credit report</AppText>
        <AppText variant="captionSmall" color="lightGray">All accounts, loans, EMIs, enquiries & payment history downloadable PDF.</AppText>
        <Button size="small" fullWidth onPress={onOpenDetailed}>Get Full Report For Free</Button>
      </View>
      <View style={styles.card}>
        <AppText variant="caption" weight="semiBold" color="black">{"What's shaping your score"}</AppText>
        {factors.map((factor) => <HealthRow key={factor.category} factor={factor} />)}
      </View>
      <View style={[styles.card, styles.tip]}>
        <Lightbulb size={20} color={colors.primary.main} />
        <View style={styles.tipCopy}><AppText variant="caption" weight="semiBold" color="black">Boost your score faster</AppText><AppText variant="captionSmall" style={styles.mutedText}>{weakest?.description ?? 'Keep payments on time and credit utilisation low.'}</AppText></View>
      </View>
      <AppText variant="captionExtraSmall" align="center" style={styles.mutedText}>Your score refreshes automatically every 30 days</AppText>
    </ScrollView>
    <View style={styles.footer}>
      {downloadStatus ? <AppText variant="captionSmall" align="center" color={downloadStatus.includes('success') ? 'success' : 'error'}>{downloadStatus}</AppText> : null}
      <Button fullWidth size="large" loading={downloading} leftIcon={<Download size={18} color={colors.primary.contrast} />} onPress={onDownload}>Download Full Report</Button>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary }, content: { gap: spacing.base, paddingBottom: 110 },
  hero: { paddingTop: spacing.xl, paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  heroHeader: { minHeight: 40, marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: spacing.sm },
  creditScoreLabel: { marginLeft: spacing.sm },
  range: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.lg },
  summaryCard: { marginHorizontal: spacing.base, borderWidth: 1, borderColor: colors.border.light, borderRadius: radius.xl, padding: spacing.base, gap: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.sm }, metric: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.primary.main, borderRadius: radius.md, paddingVertical: spacing.md },
  card: { marginHorizontal: spacing.base, borderWidth: 1, borderColor: colors.border.light, borderRadius: radius.xl, padding: spacing.base, gap: spacing.md }, offerCard: { borderColor: colors.primary.main }, badge: { alignSelf: 'flex-start', backgroundColor: colors.text.black, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  darkCard: { backgroundColor: colors.background.dark, borderColor: colors.background.dark }, whiteBadge: { backgroundColor: colors.background.primary, alignSelf: 'flex-start', borderRadius: radius.sm, padding: spacing.xs },
  factor: { gap: spacing.xs }, row: { flexDirection: 'row', justifyContent: 'space-between' }, track: { height: 5, borderRadius: radius.full, backgroundColor: colors.border.light, overflow: 'hidden' }, progress: { height: '100%', borderRadius: radius.full },
  tip: { flexDirection: 'row', borderColor: colors.primary.main }, tipCopy: { flex: 1, gap: spacing.xs }, mutedText: { color: colors.text.black }, footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.base, gap: spacing.sm, backgroundColor: colors.background.primary, borderTopWidth: 1, borderTopColor: colors.border.light },
});

import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ArrowRight, Calendar, Check, Lock } from 'lucide-react-native';
import { AppText } from '../AppText';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';
import { buildEmiHomePlan, type EmiHomeStepState } from '@/src/utils/emi-presentation';
import type { Loan } from '@/src/types';

const NODE_SIZE = spacing.xl + spacing.xs;
const NODE_TRACK = NODE_SIZE + spacing.sm;
const AURA_SIZE = spacing['6xl'] + spacing['5xl'];
const MAX_INLINE_STEPS = 4;
const CONNECTOR_HEIGHT = 3;

interface EmiHomePlanCardProps {
  loan: Loan;
  onPayPress?: () => void;
  disabled?: boolean;
}

function statusColor(state: EmiHomeStepState): string {
  if (state === 'paid') return colors.emi.paid;
  if (state === 'due') return colors.warning.main;
  if (state === 'overdue') return colors.error.overdue;
  return colors.text.secondary;
}

function connectorColors(from: EmiHomeStepState, to: EmiHomeStepState): readonly [string, string] {
  if (from === 'paid' && to === 'paid') return [colors.emi.paid, colors.emi.paid];
  if (from === 'paid' && (to === 'due' || to === 'overdue')) return [colors.emi.paid, colors.warning.main];
  return [colors.border.light, colors.border.light];
}

function StepNode({ state }: { state: EmiHomeStepState }) {
  if (state === 'paid') {
    return <View style={[styles.node, styles.nodePaid]}><Check size={14} color={colors.text.inverse} strokeWidth={3} /></View>;
  }
  if (state === 'upcoming') {
    return <View style={[styles.node, styles.nodeUpcoming]}><Lock size={13} color={colors.text.secondary} /></View>;
  }
  const accent = state === 'overdue' ? colors.error.overdue : colors.warning.main;
  return <View style={[styles.nodeHalo, { backgroundColor: state === 'overdue' ? colors.error.bg : colors.warning.bg }]}>
    <View style={[styles.node, styles.nodeDue, { borderColor: accent }]}><View style={[styles.nodeDot, { backgroundColor: accent }]} /></View>
  </View>;
}

function CardAura() {
  return <Svg pointerEvents="none" width={AURA_SIZE} height={spacing['5xl']} viewBox="0 0 180 80" style={styles.aura}>
    <Path d="M20 0C55 8 70 36 48 62C30 82 110 78 180 36V0H20Z" fill={colors.primary.lightest} />
    <Path d="M78 0C118 6 150 28 180 18V0H78Z" fill={colors.primary.opacity40} />
  </Svg>;
}

export function EmiHomePlanCard({ loan, onPayPress, disabled = false }: EmiHomePlanCardProps) {
  const plan = buildEmiHomePlan(loan);
  const scrollSteps = plan.steps.length > MAX_INLINE_STEPS;
  const payDisabled = disabled || !plan.canPay || typeof onPayPress !== 'function';
  let badgeStyle = styles.badgeDue;
  let badgeTextStyle = styles.badgeTextDark;
  if (plan.badgeLabel === 'Overdue') {
    badgeStyle = styles.badgeOverdue;
    badgeTextStyle = styles.badgeTextLight;
  } else if (plan.badgeLabel === 'Paid') {
    badgeStyle = styles.badgePaid;
    badgeTextStyle = styles.badgeTextLight;
  }
  const steps = plan.steps.map((step, index) => {
    const next = plan.steps[index + 1];
    let connector: React.ReactNode = null;
    if (next) {
      connector = <LinearGradient colors={connectorColors(step.state, next.state)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.connector} />;
    }
    return <View key={step.id} style={[styles.step, scrollSteps ? styles.stepFixed : null]}>
      <View style={styles.nodeTrack}>
        {connector}
        <StepNode state={step.state} />
      </View>
      <AppText variant="captionSmall" weight="medium" style={styles.stepTitle}>{step.title}</AppText>
      <AppText variant="captionExtraSmall" weight="semiBold" style={[styles.stepStatus, { color: statusColor(step.state) }]}>{step.statusLabel}</AppText>
    </View>;
  });
  const timeline = scrollSteps
    ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeline}>{steps}</ScrollView>
    : <View style={styles.timeline}>{steps}</View>;
  return <View style={styles.card}>
    <CardAura />
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <AppText variant="h3" weight="bold" style={styles.title}>Your EMI Plan</AppText>
        <AppText variant="caption" style={styles.subtitle}>Track your dues and pay on time</AppText>
      </View>
      <View style={[styles.badge, badgeStyle]}>
        <AppText variant="captionSmall" weight="semiBold" style={badgeTextStyle}>{plan.badgeLabel}</AppText>
      </View>
    </View>
    <View style={styles.metrics}>
      <View style={styles.metric}>
        <View style={styles.metricIconDue}><Calendar size={16} color={colors.text.primary} /></View>
        <View style={styles.metricCopy}>
          <AppText variant="captionExtraSmall" weight="medium" style={styles.metricLabel}>MONTHLY EMI</AppText>
          <AppText variant="bodyLarge" weight="bold" style={styles.metricValue}>{formatCurrency(plan.monthlyEmi, true)}</AppText>
        </View>
      </View>
      <View style={styles.metric}>
        <View style={styles.metricIconNext}><Calendar size={16} color={colors.text.secondary} /></View>
        <View style={styles.metricCopy}>
          <AppText variant="captionExtraSmall" weight="medium" style={styles.metricLabel}>NEXT DUE</AppText>
          <AppText variant="bodyLarge" weight="bold" style={styles.metricValue}>{plan.nextDueLabel}</AppText>
        </View>
      </View>
    </View>
    {timeline}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: payDisabled }} disabled={payDisabled} onPress={onPayPress} style={[styles.payButton, payDisabled ? styles.payButtonDisabled : null]}>
      <AppText variant="body" weight="bold" style={styles.payLabel}>Pay Now</AppText>
      <View style={styles.payArrow}><ArrowRight size={20} color={colors.text.primary} /></View>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.background.primary, borderRadius: radius['2xl'], padding: spacing.base, marginBottom: spacing.lg, overflow: 'hidden', ...shadows.md },
  aura: { position: 'absolute', top: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.base },
  headerCopy: { flex: 1, gap: spacing.xs, paddingRight: spacing.xl },
  title: { color: colors.text.black, lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight },
  subtitle: { color: colors.text.secondary },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.xs },
  badgeDue: { backgroundColor: colors.primary.main },
  badgeOverdue: { backgroundColor: colors.error.overdue },
  badgePaid: { backgroundColor: colors.emi.paid },
  badgeTextDark: { color: colors.text.primary },
  badgeTextLight: { color: colors.text.inverse },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background.cream, borderRadius: radius.lg, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  metricIconDue: { width: spacing['3xl'], height: spacing['3xl'], borderRadius: radius.full, backgroundColor: colors.warning.bg, alignItems: 'center', justifyContent: 'center' },
  metricIconNext: { width: spacing['3xl'], height: spacing['3xl'], borderRadius: radius.full, backgroundColor: colors.background.tertiary, alignItems: 'center', justifyContent: 'center' },
  metricCopy: { flex: 1, minWidth: 0 },
  metricLabel: { color: colors.text.secondary, letterSpacing: 0.6 },
  metricValue: { color: colors.text.black, lineHeight: typography.fontSize.lg * typography.lineHeight.tight },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  step: { flex: 1, alignItems: 'center', minWidth: 0 },
  stepFixed: { width: spacing['6xl'], flex: 0 },
  nodeTrack: { width: '100%', height: NODE_TRACK, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  connector: { position: 'absolute', left: '50%', width: '100%', height: CONNECTOR_HEIGHT, top: (NODE_TRACK - CONNECTOR_HEIGHT) / 2 },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  nodeHalo: { width: NODE_SIZE + spacing.sm, height: NODE_SIZE + spacing.sm, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  nodePaid: { backgroundColor: colors.emi.paid },
  nodeUpcoming: { backgroundColor: colors.border.light },
  nodeDue: { backgroundColor: colors.background.primary, borderWidth: 2 },
  nodeDot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.full },
  stepTitle: { color: colors.text.primary, textAlign: 'center' },
  stepStatus: { textAlign: 'center' },
  payButton: { minHeight: spacing['3xl'] + spacing.sm, borderRadius: radius.lg, backgroundColor: colors.primary.main, alignItems: 'center', justifyContent: 'center' },
  payButtonDisabled: { opacity: 0.5 },
  payLabel: { color: colors.text.black },
  payArrow: { position: 'absolute', right: spacing.base },
});

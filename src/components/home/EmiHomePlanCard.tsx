import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Lock } from 'lucide-react-native';
import { AppText } from '../AppText';
import { colors, radius, spacing, typography } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';
import { buildEmiHomePlan, type EmiHomeStepState } from '@/src/utils/emi-presentation';
import type { Loan } from '@/src/types';

const NODE_SIZE = spacing.xl + spacing.xs;
const NODE_TRACK = NODE_SIZE;
const MAX_INLINE_STEPS = 4;
const CONNECTOR_HEIGHT = spacing.xs;

interface EmiHomePlanCardProps {
  loan: Loan;
  onPayPress?: () => void;
  disabled?: boolean;
}

function statusColor(state: EmiHomeStepState): string {
  if (state === 'paid') return colors.emi.paid;
  return colors.text.black;
}

function connectorColor(from: EmiHomeStepState): string {
  if (from === 'paid') return colors.emi.paid;
  return colors.background.tertiary;
}

function StepNode({ state }: { state: EmiHomeStepState }) {
  if (state === 'paid') {
    return <View style={[styles.node, styles.nodePaid]}><Check size={14} color={colors.text.inverse} strokeWidth={3} /></View>;
  }
  if (state === 'upcoming') {
    return <View style={[styles.node, styles.nodeUpcoming]}><Lock size={14} color={colors.background.primary} /></View>;
  }
  return <View style={[styles.node, styles.nodeDue]}><View style={styles.nodeDot} /></View>;
}

export function EmiHomePlanCard({ loan, onPayPress, disabled = false }: EmiHomePlanCardProps) {
  const plan = buildEmiHomePlan(loan);
  const scrollSteps = plan.steps.length > MAX_INLINE_STEPS;
  const payDisabled = disabled || !plan.canPay || typeof onPayPress !== 'function';
  const steps = plan.steps.map((step, index) => {
    const next = plan.steps[index + 1];
    let connector: React.ReactNode = null;
    if (next) {
      connector = <View style={[styles.connector, { backgroundColor: connectorColor(step.state) }]} />;
    }
    return <View key={step.id} style={[styles.step, scrollSteps ? styles.stepFixed : null]}>
      <View style={styles.nodeTrack}>
        {connector}
        <StepNode state={step.state} />
      </View>
      <AppText variant="captionSmall" weight="medium" style={styles.stepTitle}>{step.title}</AppText>
      <AppText variant="caption" weight="semiBold" style={[styles.stepStatus, { color: statusColor(step.state) }]}>{step.statusLabel}</AppText>
    </View>;
  });
  const timeline = scrollSteps
    ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeline}>{steps}</ScrollView>
    : <View style={styles.timeline}>{steps}</View>;
  return <View style={styles.card}>
    <View style={styles.badge}>
      <AppText variant="captionSmall" weight="bold" style={styles.badgeText}>{plan.badgeLabel.toUpperCase()}</AppText>
    </View>
    <AppText variant="h3" weight="bold" align="center" style={styles.title}>Your EMI Plan</AppText>
    <AppText variant="caption" align="center" style={styles.subtitle}>Track your dues and pay on time</AppText>
    <View style={styles.metrics}>
      <View style={styles.metric}>
        <AppText variant="caption" align="center" style={styles.metricLabel}>Monthly EMI</AppText>
        <AppText variant="body" weight="bold" align="center" style={styles.metricValue}>{formatCurrency(plan.monthlyEmi, true)}</AppText>
      </View>
      <View style={styles.metric}>
        <AppText variant="caption" align="center" style={styles.metricLabel}>Next Due</AppText>
        <AppText variant="body" weight="bold" align="center" style={styles.metricValue}>{plan.nextDueLabel}</AppText>
      </View>
    </View>
    {timeline}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: payDisabled }} disabled={payDisabled} onPress={onPayPress} style={[styles.payButton, payDisabled ? styles.payButtonDisabled : null]}>
      <AppText variant="body" weight="bold" style={styles.payLabel}>Pay Now</AppText>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.primary.main, borderRadius: radius['2xl'], padding: spacing.base, paddingTop: spacing.xl, marginBottom: spacing.lg, overflow: 'hidden' },
  badge: { position: 'absolute', top: 0, right: radius['2xl'], backgroundColor: colors.text.black, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  badgeText: { color: colors.primary.main, lineHeight: typography.fontSize.xs * typography.lineHeight.tight },
  title: { color: colors.text.black, lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight },
  subtitle: { color: colors.text.black, marginTop: spacing.xs, marginBottom: spacing.base },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  metric: { flex: 1, alignItems: 'center', backgroundColor: colors.background.primary, borderRadius: radius.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.sm, gap: spacing.xs },
  metricLabel: { color: colors.text.black },
  metricValue: { color: colors.text.black, lineHeight: typography.fontSize.base * typography.lineHeight.tight },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  step: { flex: 1, alignItems: 'center', minWidth: 0 },
  stepFixed: { width: spacing['6xl'], flex: 0 },
  nodeTrack: { width: '100%', height: NODE_TRACK, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  connector: { position: 'absolute', left: '50%', width: '100%', height: CONNECTOR_HEIGHT, top: (NODE_TRACK - CONNECTOR_HEIGHT) / 2 },
  node: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  nodePaid: { backgroundColor: colors.emi.paid },
  nodeUpcoming: { backgroundColor: colors.background.tertiary },
  nodeDue: { backgroundColor: colors.background.primary, borderWidth: 3, borderColor: colors.background.primary },
  nodeDot: { width: spacing.md, height: spacing.md, borderRadius: radius.full, backgroundColor: colors.primary.main },
  stepTitle: { color: colors.text.black, textAlign: 'center' },
  stepStatus: { textAlign: 'center' },
  payButton: { minHeight: spacing['3xl'] + spacing.md, borderRadius: radius.lg, backgroundColor: colors.text.black, alignItems: 'center', justifyContent: 'center' },
  payButtonDisabled: { opacity: 0.5 },
  payLabel: { color: colors.primary.main },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useCurrentOfferStore } from '@/src/store';
import { getCurrentEmiOffer, isCurrentOfferSuccess } from '@/src/types/offer';
import { isEmiLoanType, mapEmiApprovedOfferDisplay } from '@/src/utils';
import { formatCurrency } from '@/src/utils/common-helper';
import { colors, radius, spacing } from '@/src/theme';
import { AppText } from './AppText';

export function SelectedOfferCard() {
  const response = useCurrentOfferStore((state) => state.lastResponse);
  const [expanded, setExpanded] = useState(false);

  if (!response?.success || !response.data || !isCurrentOfferSuccess(response.data)) {
    return null;
  }

  const { offer, loanType } = response.data;
  const emiOffer = getCurrentEmiOffer(response.data);
  const isEmi = isEmiLoanType(loanType);
  const emiDisplay = isEmi ? mapEmiApprovedOfferDisplay(offer, emiOffer) : null;
  const amount = emiDisplay?.summaryLoanAmount ?? formatAmount(offer.offerAmount);
  const tenure = emiDisplay?.summaryTenure ?? (Number.isFinite(offer.loanTenure) ? `${offer.loanTenure} days` : '—');
  const rateSuffix = loanType === 'PAY_DAY' ? 'p.d.' : 'p.a.';
  const interest = emiDisplay?.interestRate ?? (Number.isFinite(offer.interestRate) ? `${offer.interestRate}% ${rateSuffix}` : '—');
  const totalRepayable = emiDisplay?.totalPayable ?? formatAmount(offer.payableAmount);
  const toggleLabel = expanded ? 'Hide' : 'Show Details';
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.summary}
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={`${toggleLabel} of your selected offer`}
        accessibilityState={{ expanded }}
      >
        <View style={styles.currencyIcon}>
          <AppText variant="h4" weight="semiBold" color="textprimary">₹</AppText>
        </View>
        <View style={styles.offer}>
          <AppText variant="captionExtraSmall" color="gray">YOUR SELECTED OFFER</AppText>
          <AppText variant="body" weight="semiBold" color="textprimary">{amount} · {tenure}</AppText>
        </View>
        <View style={styles.toggle}>
          <AppText variant="captionSmall" weight="medium" color="textprimary">{toggleLabel}</AppText>
          <Chevron size={spacing.base} color={colors.text.primary} />
        </View>
      </Pressable>
      {expanded && (
        <View style={styles.details}>
          <View style={styles.detail}>
            <AppText variant="captionSmall" color="gray">Interest</AppText>
            <AppText variant="captionSmall" weight="medium" color="textprimary">{interest}</AppText>
          </View>
          <View style={styles.detail}>
            <AppText variant="captionSmall" color="gray">Total repayable</AppText>
            <AppText variant="captionSmall" weight="medium" color="textprimary">{totalRepayable}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

function formatAmount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatCurrency(value, true, { maximumFractionDigits: 2 })
    : '—';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary.lightest_3,
    borderColor: colors.primary.main,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currencyIcon: {
    width: spacing['4xl'],
    height: spacing['4xl'],
    borderRadius: radius.xl,
    backgroundColor: colors.primary.opacity40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offer: { flex: 1, gap: spacing.xs },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  details: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderStyle: 'dotted',
    borderColor: colors.primary.main,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  detail: { flex: 1, gap: spacing.xs },
});

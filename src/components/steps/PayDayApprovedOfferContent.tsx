import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { EmiRepaymentAccordion } from '../loans';
import { VerifiedOfferStatusContent } from '../offer-status';
import type { PayDayApprovedOfferContentProps } from '@/src/types';
import { colors, spacing, radius } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';
import {
  mapPayDayLoanDetailsAccordionItem,
  mapPayDayUnlockAccordionItems,
} from '../../utils/offer-helpers';
import { isStarterTierVerifiedOffer } from '../offer-status/verifiedOfferStatus.logic';

export function PayDayApprovedOfferContent({
  offer,
  loanType,
}: PayDayApprovedOfferContentProps): React.ReactElement {
  const offerAmount = offer.offerAmount ?? 0;
  const isStarterTier = isStarterTierVerifiedOffer(offerAmount);
  const loanDetailsItem = mapPayDayLoanDetailsAccordionItem(offer, loanType);
  const unlockItems = mapPayDayUnlockAccordionItems();
  const rateSuffix = loanType === 'PAY_DAY' ? 'P.D' : 'P.A';

  if (isStarterTier) {
    return (
      <>
        <VerifiedOfferStatusContent
          isOfferScreen
          expandableLoanDetails={{
            breakdownRows: loanDetailsItem.breakdownRows,
            totalLabel: loanDetailsItem.totalLabel,
            totalValue: loanDetailsItem.totalValue,
          }}
        />
        <EmiRepaymentAccordion
          title="Unlock higher amounts"
          items={unlockItems}
          allowToggle={false}
        />
      </>
    );
  }

  return (
    <View style={styles.content}>
      <View style={styles.amountHeader}>
        <AppText style={styles.amountLabel} variant="caption" weight="medium">
          Your Loan Amount
        </AppText>
        <AppText style={styles.amountValue} variant="h1" weight="semiBold">
          {formatCurrency(offerAmount, true, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </AppText>
      </View>
      <View style={styles.card}>
        <AppText style={styles.cardTitle} variant="caption" weight="semiBold">
          Loan Details
        </AppText>
        <DetailRow
          label="Loan Amount"
          value={formatCurrency(offerAmount, true, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        />
        <DetailRow label="Repayment Period" value={`${offer.loanTenure} days`} />
        <DetailRow
          label="Interest Rate"
          value={`${offer.interestRate}% ${rateSuffix}`}
        />
        <DetailRow
          label="Total Amount to Repay"
          value={formatCurrency(offer.payableAmount, true, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          isLast
        />
      </View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

function DetailRow({ label, value, isLast = false }: DetailRowProps): React.ReactElement {
  return (
    <>
      <View style={styles.row}>
        <AppText style={styles.label} variant="caption">
          {label}
        </AppText>
        <AppText style={styles.value} variant="caption" weight="semiBold">
          {value}
        </AppText>
      </View>
      {!isLast ? <View style={styles.divider} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
  },
  amountHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  amountLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  label: {
    color: colors.text.secondary,
    flex: 1,
  },
  value: {
    color: colors.text.primary,
    textAlign: 'right',
  },
});

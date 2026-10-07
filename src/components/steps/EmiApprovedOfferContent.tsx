import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { AppText } from '../AppText';
import { EmiRepaymentAccordion, LoanDetailRow } from '../loans';
import type {
  CurrentEmiOfferRepaymentPlanItem,
  EmiApprovedOfferContentProps,
  EmiRepaymentAccordionItem,
  EmiSummaryCardProps,
} from '@/src/types';
import { colors, spacing, radius } from '@/src/theme';
import { mapEmiApprovedOfferDisplay } from '../../utils/offer-helpers';
import { formatCurrency } from '@/src/utils/common-helper';
import { formatLoanDueDate } from '@/src/utils/loan-helpers';

interface EmiRepaymentPlanProps {
  items: CurrentEmiOfferRepaymentPlanItem[];
}

function EmiCongratulationsHeader() {
  return (
    <View style={styles.congratsSection}>
      <View style={styles.checkIconOuter}>
        <View style={styles.checkIconInner}>
          <Check size={28} color={colors.primary.contrast} strokeWidth={2.5} />
        </View>
      </View>
      <AppText style={styles.congratsTitle} variant="bodyLarge" weight="bold">
        Congratulations!
      </AppText>
    </View>
  );
}

function EmiSummaryCard({ loanAmount, tenure }: EmiSummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryColumn}>
        <AppText style={styles.summaryLabel} variant="caption" weight="medium">
          Loan Amount
        </AppText>
        <AppText style={styles.summaryValue} variant="bodyLarge" weight="semiBold">
          {loanAmount}
        </AppText>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryColumn}>
        <AppText style={styles.summaryLabel} variant="caption" weight="medium">
          Tenure
        </AppText>
        <AppText style={styles.summaryValue} variant="bodyLarge" weight="semiBold">
          {tenure}
        </AppText>
      </View>
    </View>
  );
}

function mapRepaymentPlanItem(
  item: CurrentEmiOfferRepaymentPlanItem,
  index: number
): EmiRepaymentAccordionItem {
  const emiNumber = item.index + 1;
  return {
    id: `${item.index}-${item.dueDate}`,
    badgeLabel: String(emiNumber),
    title: `EMI ${emiNumber}`,
    dueLabel: `Due ${formatLoanDueDate(item.dueDate)}`,
    amount: formatCurrency(item.emiAmount, true),
    breakdownRows: [
      { label: 'Principal', value: formatCurrency(item.principal, true) },
      { label: 'Interest', value: formatCurrency(item.interest, true) },
    ],
    totalLabel: 'EMI amount',
    totalValue: formatCurrency(item.emiAmount, true),
    defaultExpanded: index === 0,
  };
}

function EmiRepaymentPlan({ items }: EmiRepaymentPlanProps) {
  const repaymentItems: EmiRepaymentAccordionItem[] = items.map(mapRepaymentPlanItem);

  return (
    <EmiRepaymentAccordion title="Your EMI Repayment Plan" items={repaymentItems} />
  );
}

export function EmiApprovedOfferContent({ offer, emiOffer }: EmiApprovedOfferContentProps) {
  const display = mapEmiApprovedOfferDisplay(offer, emiOffer);
  let repaymentPlanNode: React.ReactNode = null;
  if (emiOffer?.repaymentPlan != null && emiOffer.repaymentPlan.length > 0) {
    repaymentPlanNode = <EmiRepaymentPlan items={emiOffer.repaymentPlan} />;
  }

  return (
    <>
      <EmiCongratulationsHeader />
      <EmiSummaryCard loanAmount={display.summaryLoanAmount} tenure={display.summaryTenure} />
      <View style={styles.detailsSection}>
        <LoanDetailRow label="Loan Amount" value={display.loanAmount} />
        <LoanDetailRow label="Total Amount Payable" value={display.totalPayable} />
        <LoanDetailRow label="Tenure" value={display.tenure} />
        <LoanDetailRow label="Monthly EMI Amount" value={display.monthlyEmi} />
        {display.repaymentPlan != null && (
          <LoanDetailRow
            label="Repayment Plan"
            value={display.repaymentPlan}
          />
        )}
        <LoanDetailRow label="Interest Rate" value={display.interestRate} />
        <LoanDetailRow label="EMI Deduction Day" value={display.emiDeductionDay} />
        <LoanDetailRow label="Processing Fee" value={display.processingFee} />
      </View>
      {repaymentPlanNode}
    </>
  );
}

const styles = StyleSheet.create({
  congratsSection: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  checkIconOuter: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.primary.lightest_2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconInner: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  congratsTitle: {
    color: colors.primary.main,
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.lightest_3,
    borderWidth: 1,
    borderColor: colors.primary.lightest,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.primary.lightest,
    marginHorizontal: spacing.sm,
  },
  summaryLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    color: colors.primary.main,
    textAlign: 'center',
  },
  detailsSection: {
    marginBottom: spacing.sm,
  },
});

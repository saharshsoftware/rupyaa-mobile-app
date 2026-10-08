import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { STICKY_FOOTER_PADDING } from '@/src/components';
import { Button } from '@/src/components/Button';
import { colors, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';
import {
  formatLoanDate,
  getDisbursedDateString,
  getApplicationDisplay,
} from '@/src/utils/loan-formatters';
import type { Loan } from '@/src/types/loans';
import { LoanDetailRow, AmountSummaryBox } from './LoanDetailSection';
import { LoanApplicationHeader } from './LoanApplicationHeader';
import ErrorContainer from '../ErrorContainer';
import { isEmiLoan } from '@/src/utils/loan-helpers';
import { EmiForeclosureCard } from './EmiForeclosureCard';

export interface ForeclosureCardProps {
  loan: Loan;
  foreclosureAmount: number;
  interestSaved: number;
  totalDueOnDueDate: number;
  onForeclosePress: () => void;
  ctaLoading?: boolean;
  ctaError?: string | null;
}

/**
 * Foreclosure card: full loan details, total amount box, and Foreclose Loan CTA.
 * CTA is fixed at the bottom and always visible.
 */
export function ForeclosureCard({
  loan,
  foreclosureAmount,
  onForeclosePress,
  ctaLoading = false,
  ctaError = null,
}: ForeclosureCardProps): React.ReactElement {
  if (isEmiLoan(loan)) {
    return <EmiForeclosureCard loan={loan} foreclosureAmount={foreclosureAmount}
      interestSaved={0} totalDueOnDueDate={loan.totalPayable}
      onForeclosePress={onForeclosePress} ctaLoading={ctaLoading} ctaError={ctaError} />;
  }
  const loanStatus = loan.status ?? '';
  // The caller (foreclosuer.tsx) resolves the correct payable amount via
  // resolveForeclosureTotalPayable — this component just displays what it receives.
  const payFullAmount = foreclosureAmount;
  const totalPayable = loan?.totalPayable ?? 0;
  const amountDue = loan?.amountDue ?? 0;
  
  // const loanStatus = 'overdue';
  const tenureDays = loan.tenure ? `${loan.tenure} days` : 'N/A';
  const interestDisplay =
    loan.interestRate != null ? `${loan.interestRate}%` : 'N/A';

  return (
    <View style={styles.card}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: STICKY_FOOTER_PADDING }]}
        showsVerticalScrollIndicator={false}
      >
        <LoanApplicationHeader
          applicationDisplay={getApplicationDisplay(loan)}
          status={loanStatus}
          style={styles.applicationHeader}
        />
        <View style={styles.details}>
          <LoanDetailRow label="Principal Amount" value={formatCurrency(loan.amount)} />
          <LoanDetailRow label="Loan Tenure" value={tenureDays} />
          <LoanDetailRow label="Disbursed on" value={getDisbursedDateString(loan)} />
          <LoanDetailRow label="Due Date" value={formatLoanDate(loan.dueDate)} />
          <LoanDetailRow label="Interest (per day)" value={interestDisplay} />
          <LoanDetailRow
            label="Total payable"
            value={formatCurrency(totalPayable ?? 0)}
          />
          <LoanDetailRow
            label="Payment due today"
            value={formatCurrency(amountDue)}
          />
        </View>
        <AmountSummaryBox
          label="Total Amount Due"
          amount={formatCurrency(amountDue)}
        />
        {/* <AppText variant="captionSmall"  style={styles.disclaimer}>
          {NBFC_DISCLAIMER}
        </AppText> */}
      </ScrollView>
      <ErrorContainer
        responseError={ctaError ?? ''}
      />

      <Button
        title={ctaLoading ? '' : `Pay Full Amount ${formatCurrency(amountDue)}`}
        onPress={onForeclosePress}
        loading={ctaLoading}
        disabled={ctaLoading}
        fullWidth
        style={styles.cta}
      />


    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.background.primary,
    // borderRadius: radius.lg,
    // borderWidth: 1,
    // borderColor: colors.border.light,
    // padding: spacing.lg,
    // ...shadows.sm,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    // paddingBottom handled by STICKY_FOOTER_PADDING
  },
  applicationHeader: {
    marginBottom: spacing.md,
  },
  details: {
    gap: 0,
  },
  ctaError: {
    marginTop: spacing.sm,
  },
  disclaimer: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  cta: {
    marginVertical: spacing.md,
  },
});

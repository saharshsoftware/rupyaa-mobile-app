import React from 'react';
import { router } from 'expo-router';
import { EmiPaymentContent } from './EmiPaymentContent';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from '@/src/components';
import { colors, spacing } from '@/src/theme';
import { resolveActiveLoanScreenType } from '@/src/utils/loan-helpers';
import type { Loan } from '@/src/types/loans';
import { ForeclosureCard } from './ForeclosureCard';
import { PaymentCard } from './PaymentCard';

export interface ActiveLoanContentProps {
  loan: Loan | null;
  isLoading: boolean;
  error: Error | null;
  /** Called when user taps Foreclose Now. (loanId, amount) for payment order API. */
  onForeclosePress?: (loanId: string, amount: number) => void | Promise<void>;
  /** Called when user taps Make Payment. (loanId, amount) for payment order API. */
  onPaymentPress?: (loanId: string, amount: number) => void | Promise<void>;
  /** Show loading on CTA buttons (e.g. while creating payment order). */
  ctaLoading?: boolean;
  /** Error message from payment flow (order or Cashfree). */
  ctaError?: string | null;
}

/**
 * Derives foreclosure amounts from loan when backend does not provide them.
 * Replace with API payload when get-payable-today or loan response includes these fields.
 */
function getForeclosureAmountsFromLoan(loan: Loan): {
  foreclosureAmount: number;
  interestSaved: number;
  totalDueOnDueDate: number;
} {
  const totalDueOnDueDate = loan.totalPayable ?? 0;
  return {
    foreclosureAmount: totalDueOnDueDate,
    interestSaved: 0,
    totalDueOnDueDate,
  };
}

export function ActiveLoanContent({
  loan,
  isLoading,
  error,
  onForeclosePress,
  onPaymentPress,
  ctaLoading = false,
  ctaError = null,
}: ActiveLoanContentProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
        <AppText variant="body" style={styles.message}>
          Loading your loan...
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" color="error" style={styles.message}>
          {error.message}
        </AppText>
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.centered}>
        <AppText variant="body" style={styles.message}>
          No active loan found.
        </AppText>
      </View>
    );
  }

  const screenType = resolveActiveLoanScreenType(loan);

  if (screenType === 'foreclosure') {
    const amounts = getForeclosureAmountsFromLoan(loan);
    return (
      <ForeclosureCard
        loan={loan}
        foreclosureAmount={amounts.foreclosureAmount}
        interestSaved={amounts.interestSaved}
        totalDueOnDueDate={amounts.totalDueOnDueDate}
        onForeclosePress={() =>
          onForeclosePress?.(loan._id, amounts.foreclosureAmount)
        }
        ctaLoading={ctaLoading}
        ctaError={ctaError}
      />
    );
  }

  if (screenType === 'payment-emi') {
    return (
      <EmiPaymentContent loan={loan}
        onPayPress={(amount) => onPaymentPress?.(loan._id, amount)}
        onForeclosePress={() => router.push('/offercard/foreclosuer')}
        ctaLoading={ctaLoading || !onPaymentPress} ctaError={ctaError} />
    );
  }

  if (screenType === 'payment') {
    return (
      <PaymentCard
        loan={loan}
        onPaymentPress={(amount) => onPaymentPress?.(loan._id, amount)}
        ctaLoading={ctaLoading}
        ctaError={ctaError}
      />
    );
  }

  return (
    <View style={styles.centered}>
      <AppText variant="body" color="secondary" style={styles.message}>
        No action needed for this loan status.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

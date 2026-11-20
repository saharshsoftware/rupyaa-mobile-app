import { router } from 'expo-router';
import type { Loan } from '@/src/types/loans';
import { resolveActiveLoanScreenType } from '@/src/utils/loan-helpers';

export const MY_LOAN_TAB_ROUTE = '/(tabs)/my-loan' as const;

export function navigateToMyLoanTab(): void {
  router.replace(MY_LOAN_TAB_ROUTE as never);
}

/**
 * Opens payment or foreclosure when the loan is repayable; otherwise lands on My Loan.
 * Use instead of always pushing `/payment` when screen type is unknown.
 */
export function navigateToActiveLoanRepayment(loan: Loan | null): void {
  const screenType = resolveActiveLoanScreenType(loan);
  if (screenType === 'payment' || screenType === 'payment-emi') {
    router.push('/payment');
    return;
  }
  if (screenType === 'foreclosure') {
    router.push('/offercard/foreclosuer');
    return;
  }
  navigateToMyLoanTab();
}
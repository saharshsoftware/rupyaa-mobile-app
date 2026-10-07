export interface LoanDetailsBreakdownRow {
  label: string;
  value: string;
  strong?: boolean;
}

export interface ExpandableLoanDetails {
  breakdownRows: LoanDetailsBreakdownRow[];
  totalLabel: string;
  totalValue: string;
}

export interface VerifiedOfferStatusContentProps {
  isOfferScreen?: boolean;
  expandableLoanDetails?: ExpandableLoanDetails;
}

export type LoanDetailsBreakdownRowProps = LoanDetailsBreakdownRow;

export interface ActiveLoanCardProps {
  loanNumber: number;
  title: string;
  subtitle: string;
  status: string;
  expandableLoanDetails?: ExpandableLoanDetails;
}

export interface LockedLoanRowProps {
  loanNumber: number;
  amountLabel: string;
  subtitle: string;
  moreLabel: string;
}

export interface LockedTierProps {
  amountLabel: string;
}

export interface BlurredAmountProps {
  amountLabel: string;
}

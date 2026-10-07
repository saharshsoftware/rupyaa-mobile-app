/**
 * Offer display helpers for approved-offer step (EMI vs payday).
 */

import type { CurrentEmiOffer, CurrentOfferOffer } from '@/src/types/offer';
import type { EmiRepaymentAccordionItem, LoanType } from '@/src/types/loans';
import { VERIFIED_OFFER_STATUS } from '@/src/config/verifiedOfferStatus';
import { formatCurrency } from '@/src/utils/common-helper';
import { isEmiLoanTypeValue } from '@/src/utils/loan-helpers';

const MISSING_VALUE = '—';
const CURRENCY_NO_FRACTION = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
} as const;
const CURRENCY_TWO_FRACTION = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

export interface EmiApprovedOfferDisplay {
  summaryLoanAmount: string;
  summaryTenure: string;
  loanAmount: string;
  tenure: string;
  monthlyEmi: string;
  repaymentPlan: string | null;
  interestRate: string;
  emiDeductionDay: string;
  processingFee: string;
  totalPayable: string;
}

/** True when current-offer loanType is EMI (case-insensitive). */
export function isEmiLoanType(loanType: LoanType | undefined): boolean {return isEmiLoanTypeValue(loanType);
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

/** Resolve tenure in months from offer.loanTenure or nested loanId.tenure. */
function extractTenureMonths(offer: CurrentOfferOffer): number | undefined {
  const fromTenure = parseFiniteNumber(offer.loanTenure);
  if (fromTenure != null && fromTenure > 0) return fromTenure;

  const loanId = offer.loanId;
  if (loanId != null && typeof loanId === 'object' && 'tenure' in loanId) {
    const tenureStr = String(loanId.tenure ?? '').trim();
    const match = tenureStr.match(/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

function getOrdinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/** Summary card tenure label, e.g. "3 Months". */
export function formatEmiTenureLabel(tenureMonths: number): string {
  const n = Math.round(tenureMonths);
  return n === 1 ? '1 Month' : `${n} Months`;
}

/** Detail list tenure label, e.g. "3 months". */
export function formatEmiTenureDetail(tenureMonths: number): string {
  const n = Math.round(tenureMonths);
  return n === 1 ? '1 month' : `${n} months`;
}

/** e.g. "5th of every month". */
export function formatEmiDeductionDay(day: number): string {
  const d = Math.round(day);
  if (d < 1 || d > 31) return MISSING_VALUE;
  return `${d}${getOrdinalSuffix(d)} of every month`;
}

/** e.g. "3 x ₹17,108.33/month". */
export function formatRepaymentPlan(months: number, emiAmount: number): string {
  return `${Math.round(months)} x ${formatCurrency(emiAmount)}/month`;
}

function formatCurrencyWithDecimals(amount: number): string {
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}

/** Maps current-offer API fields to EMI approved-offer display strings. */
export function mapEmiApprovedOfferDisplay(
  offer: CurrentOfferOffer,
  emiOffer?: CurrentEmiOffer
): EmiApprovedOfferDisplay {
  const offerAmount = parseFiniteNumber(emiOffer?.loanAmount) ?? parseFiniteNumber(offer.offerAmount ?? undefined);
  const tenureMonths = parseFiniteNumber(emiOffer?.tenureMonths) ?? extractTenureMonths(offer);
  const emiAmount = parseFiniteNumber(emiOffer?.monthlyEmi) ?? parseFiniteNumber(offer.emiAmount);
  const interestRate =
    parseFiniteNumber(offer.interestRate) ??
    parseFiniteNumber(emiOffer?.interestRatePerAnnum);
  const emiDeductionDay = parseFiniteNumber(emiOffer?.emiDeductionDay) ?? parseFiniteNumber(offer.emiDeductionDay);
  const processingFee = parseFiniteNumber(emiOffer?.processingFee) ?? parseFiniteNumber(offer.processingFee);
  const payableAmount = parseFiniteNumber(emiOffer?.totalPayable) ?? parseFiniteNumber(offer.payableAmount);

  const repaymentPlan =
    tenureMonths != null && emiAmount != null
      ? formatRepaymentPlan(tenureMonths, emiAmount)
      : null;

  return {
    summaryLoanAmount:
      offerAmount != null
        ? formatCurrency(offerAmount, true, CURRENCY_NO_FRACTION)
        : MISSING_VALUE,
    summaryTenure:
      tenureMonths != null ? formatEmiTenureLabel(tenureMonths) : MISSING_VALUE,
    loanAmount:
      offerAmount != null ? formatCurrencyWithDecimals(offerAmount) : MISSING_VALUE,
    tenure:
      tenureMonths != null ? formatEmiTenureDetail(tenureMonths) : MISSING_VALUE,
    monthlyEmi:
      emiAmount != null
        ? formatCurrency(emiAmount, true, CURRENCY_NO_FRACTION)
        : MISSING_VALUE,
    repaymentPlan,
    interestRate:
      interestRate != null ? `${interestRate}% Per Year` : MISSING_VALUE,
    emiDeductionDay:
      emiDeductionDay != null
        ? formatEmiDeductionDay(emiDeductionDay)
        : MISSING_VALUE,
    processingFee:
      processingFee != null
        ? formatCurrency(processingFee, true, CURRENCY_NO_FRACTION)
        : MISSING_VALUE,
    totalPayable:
      payableAmount != null
        ? formatCurrencyWithDecimals(payableAmount)
        : MISSING_VALUE,
  };
}

/** Locked upcoming tiers for starter-tier payday offers (₹1,200). */
export function mapPayDayUnlockAccordionItems(): EmiRepaymentAccordionItem[] {
  return VERIFIED_OFFER_STATUS.lockedLoans.map((loan) => ({
    id: `starter-unlock-loan-${loan.loanNumber}`,
    badgeLabel: String(loan.loanNumber),
    title: `Loan ${loan.loanNumber}`,
    dueLabel: loan.subtitle,
    amount: `${loan.moreLabel} More`,
    locked: true,
    breakdownRows: [],
    totalLabel: 'Amount',
    totalValue: loan.amountLabel,
  }));
}

/** Expandable loan-details card for starter-tier payday offers. */
export function mapPayDayLoanDetailsAccordionItem(
  offer: CurrentOfferOffer,
  loanType?: LoanType
): EmiRepaymentAccordionItem {
  const rateSuffix = loanType === 'PAY_DAY' ? 'P.D' : 'P.A';

  return {
    id: 'payday-loan-details',
    badgeLabel: '₹',
    title: 'Loan Details',
    dueLabel: `${offer.loanTenure} days tenure`,
    amount: formatCurrency(offer.offerAmount ?? 0, true, CURRENCY_NO_FRACTION),
    breakdownRows: [
      {
        label: 'Loan Amount',
        value: formatCurrency(offer.offerAmount ?? 0, true, CURRENCY_NO_FRACTION),
      },
      { label: 'Repayment Period', value: `${offer.loanTenure} days` },
      { label: 'Interest Rate', value: `${offer.interestRate}% ${rateSuffix}` },
    ],
    totalLabel: 'Total Amount to Repay',
    totalValue: formatCurrency(offer.payableAmount, true, CURRENCY_NO_FRACTION),
    defaultExpanded: false,
  };
}

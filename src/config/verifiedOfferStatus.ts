export interface VerifiedOfferLockedLoan {
  readonly loanNumber: number;
  readonly subtitle: string;
  readonly moreLabel: string;
  readonly amountLabel: string;
}

export const VERIFIED_OFFER_STATUS = {
  lockedLoans: [
    {
      loanNumber: 2,
      subtitle: 'Unlocks after repayment',
      moreLabel: '₹2,400',
      amountLabel: '₹2,400',
    },
    {
      loanNumber: 3,
      subtitle: 'Unlocks after repayment',
      moreLabel: '₹5,000',
      amountLabel: '₹5,000',
    },
  ],
} as const satisfies { lockedLoans: readonly VerifiedOfferLockedLoan[] };
/** Starter-tier offer amount that unlocks VerifiedOfferStatusContent. */
export const STARTER_TIER_OFFER_AMOUNT = 1200;

export const VERIFIED_OFFER_STATUS = {
  currentAmount: STARTER_TIER_OFFER_AMOUNT,
  currentAmountLabel: `\u20B9${STARTER_TIER_OFFER_AMOUNT.toLocaleString('en-IN')}`,
  tierLabel: 'Tier 1 of 3 • Starter limit',
  unlockedLabel: '1 of 3 unlocked',
  nextUnlockHint: 'Repay on time • unlocks next amount instantly',
  unlockAccordionTitle: 'Unlock higher amounts',
  activeLoan: {
    loanNumber: 1,
    subtitle: 'Ready to disburse',
    status: 'ACTIVE',
  },
  lockedLoans: [
    {
      loanNumber: 2,
      amountLabel: '\u20B9****',
      subtitle: 'Unlocks when Loan 1 is repaid',
      moreLabel: '+100%',
    },
    {
      loanNumber: 3,
      amountLabel: '\u20B9****',
      subtitle: 'Unlocks when Loan 2 is repaid',
      moreLabel: '+200%',
    },
  ],
} as const;

export interface VerifiedOfferLockedLoan {
  readonly loanNumber: number;
  readonly subtitle: string;
  readonly moreLabel: string;
  readonly amountLabel: string;
}

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
      amountLabel: '₹2,400',
      subtitle: 'Unlocks after repayment',
      moreLabel: '₹2,400',
    },
    {
      loanNumber: 3,
      amountLabel: '₹5,000',
      subtitle: 'Unlocks after repayment',
      moreLabel: '₹5,000',
    },
  ] as const satisfies readonly VerifiedOfferLockedLoan[],
} as const;

import {
  STARTER_TIER_OFFER_AMOUNT,
  VERIFIED_OFFER_STATUS,
} from './verifiedOfferStatus.constants';

export function getVerifiedActiveLoanTitle(): string {
  const { activeLoan, currentAmountLabel } = VERIFIED_OFFER_STATUS;
  return `Loan ${activeLoan.loanNumber} • ${currentAmountLabel}`;
}

export function isStarterTierVerifiedOffer(
  offerAmount: number | null | undefined
): boolean {
  return offerAmount === STARTER_TIER_OFFER_AMOUNT;
}

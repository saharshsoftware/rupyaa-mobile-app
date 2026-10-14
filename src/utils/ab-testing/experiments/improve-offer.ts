import { isEvenPhoneNumber } from '../is-even-phone-number';

/**
 * A/B Test: Improve Offer Action (Bank Statement Analysis / BSA)
 *
 * Variant allocation rule:
 * - Variant A (Even phone number): Show "Get a Higher Loan Amount" Bank Statement action card.
 * - Variant B (Odd phone number / missing): Hide "Get a Higher Loan Amount" card.
 *
 * @param phone - User's registered phone number
 * @returns boolean indicating whether to display the Improve Offer card.
 */
export function shouldShowImproveOfferABVariant(phone: string | null | undefined): boolean {
  return isEvenPhoneNumber(phone);
}

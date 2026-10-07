/**
 * Checks if a phone number ends with an even digit.
 * Strips non-digit characters to ensure clean parsing.
 *
 * @param phone - Phone number string (e.g., "+919876543210" or "9876543210")
 * @returns true if the last digit of the phone number is even (0, 2, 4, 6, 8); false otherwise or if invalid/missing.
 */
export function isEvenPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digitsOnly: string = phone.replace(/\D/g, '');
  if (digitsOnly.length === 0) return false;
  const lastDigitChar: string = digitsOnly.charAt(digitsOnly.length - 1);
  const lastDigit: number = parseInt(lastDigitChar, 10);
  if (Number.isNaN(lastDigit)) return false;
  return lastDigit % 2 === 0;
}

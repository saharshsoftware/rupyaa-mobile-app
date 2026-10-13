/**
 * Strips non-digit characters and truncates to `length` digits.
 * Shared by the OTP input field and the SMS Retriever autofill hook so both
 * paths apply identical parsing rules (avoids drift on length/format).
 */
export function sanitizeOtp(input: string, length: number): string {
  return input.replace(/[^0-9]/g, '').slice(0, length);
}

/**
 * Extracts the first numeric run of exactly `length` digits from an SMS body.
 * Falls back to the first digit run with at least `length` digits, truncated.
 * Returns an empty string when no digit run of the required length is found.
 *
 * Designed for SMS Retriever payloads like:
 *   "<#> 6838 is your login OTP. ... RUPYA\nWwGEKwfwaqv"
 * where we want "6838", not the 11-char app hash on the trailing line.
 */
export function extractOtpFromSms(message: string, length: number): string {
  if (!message || length <= 0) return '';

  // Prefer an exact-length numeric run so longer phone numbers / random hashes
  // don't get mistaken for the OTP.
  const exactMatch = message.match(new RegExp(`(?<!\\d)\\d{${length}}(?!\\d)`));
  if (exactMatch) return exactMatch[0];

  // Fallback: first numeric run of `length` or more digits, then truncate.
  const fallbackMatch = message.match(new RegExp(`\\d{${length},}`));
  if (fallbackMatch) return sanitizeOtp(fallbackMatch[0], length);

  return '';
}

import RazorpayCheckout from 'react-native-razorpay';
import { devConfig } from '@/src/config/dev';
import { STRING_DATA } from '@/src/constants/data';
import { resolveVerifiedPhoneNumber } from '@/src/services/user/verifiedPhoneNumber';
import { userService } from '@/src/services/user/userService';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';

export interface RazorpayCheckoutCallbacks {
  onVerify?: (orderId: string) => void;
  onError?: (message: string, orderId: string) => void;
}

/** Razorpay expects E.164-style contact (e.g. +919876543210). */
function formatRazorpayContact(phone: string | null | undefined): string | undefined {
  if (typeof phone !== 'string') return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length > 0) {
    return phone.trim().startsWith('+') ? phone.trim() : `+${digits}`;
  }
  return undefined;
}

function nonEmptyTrimmed(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveCustomerNameFromStore(): string | undefined {
  const details = useUserDetailsStore.getState().personalDetails;
  if (!details) return undefined;
  const parts = [details.firstName, details.middleName, details.lastName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0);
  if (parts.length === 0) return undefined;
  return parts.join(' ');
}

async function resolveCustomerEmailFromApi(): Promise<string | undefined> {
  try {
    const response = await userService.getContactDetails();
    if (!response.success || response.data == null) return undefined;
    return nonEmptyTrimmed(response.data.contactDetails?.email);
  } catch {
    return undefined;
  }
}

export interface OpenRazorpayPaymentCheckoutParams {
  keyId: string;
  orderId: string;
  amountRupees: number;
  description?: string;
  callbacks?: RazorpayCheckoutCallbacks;
}

function resolveRazorpayErrorMessage(error: unknown): string {
  if (error != null && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.description === 'string' && record.description.length > 0) {
      return record.description;
    }
    const nested = record.error;
    if (nested != null && typeof nested === 'object') {
      const nestedDescription = (nested as Record<string, unknown>).description;
      if (typeof nestedDescription === 'string' && nestedDescription.length > 0) {
        return nestedDescription;
      }
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Payment failed. Please try again.';
}

function logRazorpayCheckoutError(label: string, error: unknown): void {
  if (!devConfig.enableDebugLogs) return;
  console.error(label, JSON.stringify(error));
}

function logRazorpayCheckoutSuccess(label: string, response: unknown): void {
  if (!devConfig.enableDebugLogs) return;
  console.log(label, JSON.stringify(response));
}

/**
 * Opens Razorpay Standard Checkout for one-time repayment.
 * Amount from the app API is rupees; Checkout expects paise.
 * Uses key_id from create-order — never hardcode a key secret.
 */
export function openRazorpayPaymentCheckout(
  params: OpenRazorpayPaymentCheckoutParams
): void {
  const { keyId, orderId, amountRupees, description, callbacks = {} } = params;
  const { onVerify, onError } = callbacks;
  const amountPaise = Math.round(amountRupees * 100);

  void RazorpayCheckout.open({
    key: keyId,
    amount: String(amountPaise),
    currency: 'INR',
    name: STRING_DATA.APP_NAME,
    description: description ?? 'Loan repayment',
    order_id: orderId,
  })
    .then((response) => {
      logRazorpayCheckoutSuccess('Razorpay payment response', response);
      onVerify?.(orderId);
    })
    .catch((error: unknown) => {
      logRazorpayCheckoutError('Razorpay payment error', error);
      onError?.(resolveRazorpayErrorMessage(error), orderId);
    });
}

export interface OpenRazorpayMandateCheckoutParams {
  keyId: string;
  customerId: string;
  orderId: string;
  /**
   * Auth amount in paise. E-mandate authorisation orders are usually `0`.
   * Must match the Razorpay order amount created by backend.
   */
  amountPaise?: number;
  /** Optional override; defaults to verified app phone for Checkout prefill. */
  contact?: string | null;
  /** Optional override; defaults to personal-details name from the user store. */
  customerName?: string | null;
  /** Optional override; defaults to contact-details email from the user API. */
  customerEmail?: string | null;
  callbacks?: RazorpayCheckoutCallbacks;
}

/**
 * Opens Razorpay Checkout for e-mandate / recurring authorization.
 * Prefills name/email/contact (web parity) from app-owned data when not passed.
 */
export function openRazorpayMandateCheckout(
  params: OpenRazorpayMandateCheckoutParams
): void {
  const {
    keyId,
    customerId,
    orderId,
    amountPaise = 0,
    contact: contactOverride,
    customerName: customerNameOverride,
    customerEmail: customerEmailOverride,
    callbacks = {},
  } = params;
  const { onVerify, onError } = callbacks;

  void (async () => {
    const rawContact =
      typeof contactOverride === 'string' && contactOverride.trim().length > 0
        ? contactOverride
        : await resolveVerifiedPhoneNumber();
    const contact = formatRazorpayContact(rawContact);

    const name =
      nonEmptyTrimmed(customerNameOverride) ?? resolveCustomerNameFromStore();

    const email =
      nonEmptyTrimmed(customerEmailOverride) ?? (await resolveCustomerEmailFromApi());

    const prefill: { name?: string; email?: string; contact?: string } = {};
    if (name) prefill.name = name;
    if (email) prefill.email = email;
    if (contact) prefill.contact = contact;

    void RazorpayCheckout.open({
      key: keyId,
      order_id: orderId,
      customer_id: customerId,
      amount: String(amountPaise ?? 0),
      currency: 'INR',
      name: STRING_DATA.APP_NAME,
      description: 'Auto-payment setup',
      recurring: '1',
      ...(Object.keys(prefill).length > 0 ? { prefill } : {}),
    })
      .then((response) => {
        logRazorpayCheckoutSuccess('Razorpay mandate response', response);
        onVerify?.(orderId);
      })
      .catch((error: unknown) => {
        logRazorpayCheckoutError('Razorpay mandate error', error);
        onError?.(resolveRazorpayErrorMessage(error), orderId);
      });
  })();
}
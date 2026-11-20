import { resolvePaymentSdkProvider } from '@/src/config/paymentCheckout';
import type {
  CreatePaymentOrderResponseData,
  PaymentSdkProvider,
} from '@/src/types/payment';
import {
  openCashfreePaymentCheckout,
  type CashfreeCheckoutCallbacks,
} from './cashfreeCheckout';
import { openRazorpayPaymentCheckout } from './razorpayCheckout';

export interface OpenSdkPaymentCheckoutParams {
  data: CreatePaymentOrderResponseData;
  amountRupees: number;
  description?: string;
  /** From GET /loans/active `paymentGateway`; falls back via resolvePaymentSdkProvider. */
  paymentGateway?: PaymentSdkProvider | null;
  callbacks?: CashfreeCheckoutCallbacks;
}

/**
 * Opens Cashfree or Razorpay Standard Checkout based on `resolvePaymentSdkProvider()`.
 */
export function openSdkPaymentCheckout(params: OpenSdkPaymentCheckoutParams): void {
  const {
    data,
    amountRupees,
    description,
    paymentGateway: loanActiveProvider,
    callbacks = {},
  } = params;
  const provider = resolvePaymentSdkProvider(loanActiveProvider);

  if (provider === 'RAZORPAY') {
    if (!data.key_id) {
      callbacks.onError?.(
        'Invalid Razorpay payment order response. Please try again.',
        data.order_id
      );
      return;
    }
    openRazorpayPaymentCheckout({
      keyId: data.key_id,
      orderId: data.order_id,
      amountRupees,
      description,
      callbacks,
    });
    return;
  }

  if (!data.payment_session_id) {
    callbacks.onError?.(
      'Invalid Cashfree payment order response. Please try again.',
      data.order_id
    );
    return;
  }
  openCashfreePaymentCheckout(data.payment_session_id, data.order_id, callbacks);
}
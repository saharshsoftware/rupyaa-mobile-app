/**
 * Payment order types for create-payment-order API.
 */

export interface CreatePaymentOrderRequest {
  loanId: string;
  amount: number;
}

/**
 * Create-order response from POST /payment/transactions.
 * Cashfree returns `payment_session_id`; Razorpay returns `key_id`.
 * Backend should return the fields for the active provider.
 */
export interface CreatePaymentOrderResponseData {
  order_id: string;
  /** Cashfree Drop Checkout session id */
  payment_session_id?: string;
  /** Razorpay Key Id (rzp_test_* / rzp_live_*) — never a secret */
  key_id?: string;
}

/** Order statuses returned by GET /payment/order-status/:orderId (decrypted body). */
export type PaymentOrderStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

/** Decrypted payload from order-status API (wrapped in ApiResponse.data by apiClient). */
export interface OrderStatusResponseData {
  success: boolean;
  orderId: string;
  status: PaymentOrderStatus;
}

export type GenerateAndSendPaymentLinkResponse = {
  success: boolean;
  paymentLink: string;
};

/** SDK gateway used for repayment checkout. */
export type PaymentSdkProvider = 'CASHFREE' | 'RAZORPAY';
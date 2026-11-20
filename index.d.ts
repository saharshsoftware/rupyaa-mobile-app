declare module '*.jpeg';
declare module '*.jpg';
declare module '*.png';
declare module '*.webp';
declare module '*.mp4';
declare module '*.gif';
declare module 'react-native-get-sms-android';

declare module 'react-native-razorpay' {
  export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayErrorResponse {
    code?: number | string;
    description?: string;
    error?: {
      code?: string;
      description?: string;
      reason?: string;
      step?: string;
      source?: string;
    };
  }

  export interface RazorpayCheckoutOptions {
    key: string;
    /** Required for one-time repayment; omit for e-mandate when order_id carries amount. */
    amount?: number | string;
    currency: string;
    name: string;
    order_id: string;
    description?: string;
    image?: string;
    customer_id?: string;
    recurring?: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
    };
    theme?: {
      color?: string;
    };
    [key: string]: unknown;
  }

  const RazorpayCheckout: {
    open: (
      options: RazorpayCheckoutOptions
    ) => Promise<RazorpaySuccessResponse>;
  };

  export default RazorpayCheckout;
}
import type { PaymentSdkProvider } from '@/src/types/payment';

/**
 * Temporary local switch for repayment SDK gateway (Cashfree vs Razorpay).
 * Used when GET /loans/active omits `paymentGateway`.
 *
 * TODO(wire-flags): next — GET /external/app-config ProviderToggle
 * (e.g. paymentProvider: { CASHFREE, RAZORPAY }) between loans/active and this fallback.
 */
export const PAYMENT_SDK_PROVIDER: PaymentSdkProvider = 'RAZORPAY';
// export const PAYMENT_SDK_PROVIDER: PaymentSdkProvider = 'CASHFREE';

/**
 * Which payment SDK to open for repayment checkout.
 * Prefers GET /loans/active `paymentGateway`; falls back to `PAYMENT_SDK_PROVIDER`.
 */
export function resolvePaymentSdkProvider(
  loanActiveProvider?: PaymentSdkProvider | null
): PaymentSdkProvider {
  if (loanActiveProvider === 'CASHFREE' || loanActiveProvider === 'RAZORPAY') {
    return loanActiveProvider;
  }
  // const fromAppConfig = useAppConfigStore.getState().getActiveProvider('paymentProvider');
  // if (fromAppConfig === 'cashfree' || fromAppConfig === 'razorpay') {
  //   return fromAppConfig;
  // }
  return PAYMENT_SDK_PROVIDER;
}
import { useMutation } from '@tanstack/react-query';
import { resolvePaymentSdkProvider } from '@/src/config/paymentCheckout';
import { paymentService } from './paymentService';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import type {
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  PaymentSdkProvider,
} from '@/src/types/payment';

type CreatePaymentOrderVariables = CreatePaymentOrderRequest & {
  /** Client-only: from GET /loans/active `paymentGateway`; not sent to the API. */
  paymentGateway?: PaymentSdkProvider | null;
};

function hasRequiredProviderFields(
  data: CreatePaymentOrderResponseData,
  loanActiveProvider?: PaymentSdkProvider | null
): boolean {
  if (!data.order_id) return false;
  const provider = resolvePaymentSdkProvider(loanActiveProvider);
  if (provider === 'RAZORPAY') {
    return typeof data.key_id === 'string' && data.key_id.length > 0;
  }
  return typeof data.payment_session_id === 'string' && data.payment_session_id.length > 0;
}

/**
 * React Query mutation to create a payment order.
 * Validates Cashfree (`payment_session_id`) or Razorpay (`key_id`) fields
 * based on `resolvePaymentSdkProvider()`.
 */
export function useCreatePaymentOrder() {
  const mutation = useMutation({
    mutationFn: async (
      variables: CreatePaymentOrderVariables
    ): Promise<CreatePaymentOrderResponseData> => {
      const { paymentGateway, ...body } = variables;
      const response = await paymentService.createPaymentOrder(body);
      if (!response.success) {
        const message =
          getApiErrorDisplayMessage(response.error) ||
          'Failed to create payment order. Please try again.';
        throw new Error(message);
      }
      const data = response.data;
      if (data == null || !hasRequiredProviderFields(data, paymentGateway)) {
        throw new Error('Invalid payment order response. Please try again.');
      }
      return data;
    },
  });

  return mutation;
}
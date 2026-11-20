import { API_ENDPOINTS } from '@/src/config/api';
import { apiClient } from '@/src/services/api/apiClient';
import type { ApiResponse } from '@/src/types/api';
import type {
  PaymentOrderStatus,
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  OrderStatusResponseData,
} from '@/src/types/payment';

/**
 * Map backend status values to our app status values.
 */
function mapBackendStatusToPaymentOrderStatus(rawStatus: unknown): PaymentOrderStatus | null {
  if (typeof rawStatus !== 'string') return null;
  const normalized = rawStatus.toUpperCase();

  // New backend contract (recommended)
  if (normalized === 'SUCCESS') return 'SUCCESS';
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'FAILED') return 'FAILED';

  // Backward compatibility with older Cashfree-derived statuses
  if (normalized === 'PAID') return 'SUCCESS';
  if (normalized === 'ACTIVE') return 'PENDING';
  if (
    normalized === 'EXPIRED' ||
    normalized === 'TERMINATED' ||
    normalized === 'TERMINATION_REQUESTED' ||
    normalized === 'FAILED'
  ) {
    return 'FAILED';
  }

  return null;
}

/**
 * Backend may return snake_case and can wrap fields differently.
 * Normalize to app `OrderStatusResponseData` (camelCase + simplified statuses).
 */
function mapOrderStatusResponseData(raw: unknown): OrderStatusResponseData | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const orderIdRaw = o.orderId ?? o.order_id;
  if (typeof orderIdRaw !== 'string' || orderIdRaw.length === 0) return null;

  // Preferred shape: { orderId, status }
  const statusRaw = o.status ?? o.order_status ?? o.orderStatus ?? o.payment_status;
  const mappedStatus = mapBackendStatusToPaymentOrderStatus(statusRaw);
  if (mappedStatus == null) return null;

  // Some backend responses echo `success: true`; others omit it.
  const mappedSuccess =
    o.success === true || (typeof o.success === 'boolean' ? o.success : true);

  return { success: mappedSuccess, orderId: orderIdRaw, status: mappedStatus };
}

/**
 * Payment service for creating orders and initiating checkout.
 */
export const paymentService = {
  /**
   * Create a payment order (POST /payment/transactions).
   * Cashfree: order_id + payment_session_id. Razorpay: order_id + key_id.
   */
  async createPaymentOrder(
    body: CreatePaymentOrderRequest
  ): Promise<ApiResponse<CreatePaymentOrderResponseData>> {
    const response = await apiClient.post<CreatePaymentOrderResponseData>(
      API_ENDPOINTS.payment.createPaymentOrder,
      body
    );
    return response;
  },

  /**
   * GET /payment/order-status/:orderId — payment order status (response may be encrypted; apiClient decrypts).
   * Maps snake_case API fields to camelCase OrderStatusResponseData.
   */
  async getPaymentOrderStatus(
    orderId: string
  ): Promise<ApiResponse<OrderStatusResponseData>> {
    const path = `${API_ENDPOINTS.payment.orderStatus}/${encodeURIComponent(orderId)}`;
    const response = await apiClient.get<unknown>(path);

    if (!response.success) {
      return response as ApiResponse<OrderStatusResponseData>;
    }

    const mapped = mapOrderStatusResponseData(response.data);
    if (mapped == null) {
      return {
        success: false,
        error: { message: 'Invalid order status response' },
        status: response.status,
      };
    }

    return {
      success: true,
      data: mapped,
      status: response.status,
    };
  },
};

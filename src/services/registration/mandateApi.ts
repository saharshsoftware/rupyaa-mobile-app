import { apiClient } from '@/src/services/api/apiClient';
import { API_ENDPOINTS } from '@/src/config/api';
import type { ApiResponse } from '@/src/types/api';
import { isApiResponse } from '@/src/types/api';
import { getGeoLocationForEsignOrMandate } from '../location/geoLocation';
import { buildCreateMandateFailureMessage } from '@/src/utils/mandateErrors';
import { extractApiUserMessage } from '@/src/utils/common-helper';
import { pushLoanJourneyUnknownError } from '../logging';
import type { PaymentSdkProvider } from '@/src/types/payment';

export interface CreateMandateResponse {
  subscriptionId: string;
  sessionId: string;
  message: string;
  /** Which mandate SDK to open. Falls back via resolvePaymentSdkProvider when omitted. */
  paymentGateway?: PaymentSdkProvider;
  /** Razorpay Key Id (rzp_test_* / rzp_live_*) — never a secret */
  keyId?: string;
  /** Razorpay customer id for e-mandate auth */
  customerId?: string;
  /** Razorpay order id for e-mandate auth */
  orderId?: string;
}

export interface MandateRegistrationDetails {
  status: string | null;
  amount: number;
  transactionTime: string | null;
}

export interface MandateInfo {
  bankCode: string;
  bankName: string;
  mandateStatus: string;
  mandateFirstDate: string | null;
  mandateExpiryDate: string | null;
  mandateId: string;
  cf_subscriptionid: string;
  mandateAmount: number;
  mandateMaxAmount: number;
  mandateCycle: string | null;
}

export interface MandateDetailsData {
  id: string;
  registrationDetails: MandateRegistrationDetails;
  mandateDetails: MandateInfo;
}

export interface MandateDetailsResponse {
  message: string;
  data: MandateDetailsData;
}

const GENERIC_API_ERROR: ApiResponse<never> = {
  success: false,
  error: {
    message: 'Something went wrong. Please try again.',
    code: 'UNKNOWN_ERROR',
  },
};

/**
 * Normalizes mandate create failures:
 * - HTTP 200 with body `{ success: false, error: string, retryAfterSeconds?, ... }` (non-standard envelope).
 * - HTTP error where `error.details` repeats the same shape — strips `| Stack:` tails from string `error`.
 */
function normalizeCreateMandateResponse(
  response: ApiResponse<CreateMandateResponse>
): ApiResponse<CreateMandateResponse> {
  if (response.success && response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    const d = response.data as unknown as Record<string, unknown>;
    if (d.success === false) {
      return {
        success: false,
        error: {
          message: buildCreateMandateFailureMessage(d),
          code: 'MANDATE_CREATE_FAILED',
          details: d,
        },
      };
    }
  }

  if (!response.success && response.error?.details != null && typeof response.error.details === 'object') {
    const rec = response.error.details as Record<string, unknown>;
    if (rec.success === false && typeof rec.error === 'string') {
      return {
        ...response,
        error: {
          ...response.error,
          message: buildCreateMandateFailureMessage(rec),
        },
      };
    }
  }

  return response;
}

/**
 * Create eNACH mandate (POST /mandates).
 * Returns a sessionId used for the mandate authorization flow. Never throws.
 */
export async function createMandate(): Promise<ApiResponse<CreateMandateResponse>> {
  try {
    const geoLocation = await getGeoLocationForEsignOrMandate();
    const body = {
      geoLocation: `${geoLocation?.latitude},${geoLocation?.longitude}`,
    };

    const response = await apiClient.post<CreateMandateResponse>(
      API_ENDPOINTS.mandates.createMandate,
      body
    );
    if (!isApiResponse(response)) {
      return GENERIC_API_ERROR;
    }

    if (response.success === false) {
      const msg =
        extractApiUserMessage(response.error.details) ?? "Could not start mandate. Please try again.";
      throw new Error(msg);
    }
    return normalizeCreateMandateResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Fetch mandate details after successful Cashfree authorization
 * (GET /mandates/getMandateDetails). Never throws.
 */
export async function getMandateDetails(): Promise<ApiResponse<MandateDetailsResponse>> {
  try {
    const response = await apiClient.get<MandateDetailsResponse>(
      API_ENDPOINTS.mandates.getMandateDetails
    );
    if (!isApiResponse(response)) {
      pushLoanJourneyUnknownError('enach get mandate details', response);
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    pushLoanJourneyUnknownError('enach get mandate details', error);
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

/**
 * Pre-NACH gate (GET /mandates/should-stop-before-nach). Success `data` is expected to include
 * `{ shouldStop: boolean }` — when true, block ENACH/e-sign. Never throws.
 */
export async function getShouldStopBeforeNach(): Promise<ApiResponse<unknown>> {
  try {
    const response = await apiClient.get<unknown>(API_ENDPOINTS.mandates.shouldStopBeforeNach);
    if (!isApiResponse(response)) {
      pushLoanJourneyUnknownError('enach get should stop before nach', response);
      return GENERIC_API_ERROR;
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    pushLoanJourneyUnknownError('enach get should stop before nach', error);
    return {
      success: false,
      error: {
        message,
        code: 'NETWORK_ERROR',
      },
    };
  }
}

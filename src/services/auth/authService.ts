import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/src/config/api';
import { STORAGE_KEYS } from '@/src/constants/data';
import type { ApiResponse } from '@/src/types/api';
import type {
  AuthSession,
  OtpRequestPayload,
  OtpRequestResult,
  OtpVerifyPayload,
} from '@/src/types/auth';
import { apiClient } from '@/src/services/api/apiClient';
import {
  logPool,
  logPoolMessages,
  formatLogPoolApiError,
  persistLogPoolPhoneNumber,
} from '@/src/services/logging';
import { getPlayInstallReferrerForAuthPayload } from '@/src/services/installReferrer';
// import { getAdjustAttributionForAuthPayload } from '@/src/services/attribution';
import { useAuthStore } from '@/src/store/useAuthStore';
import { resetNgrokApiBaseUrlOnLogout } from '@/src/services/devToggles/devTogglesService';
import { consoleLogDev } from '@/src/utils/common-helper';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const collectNestedRecords = (record: Record<string, unknown>) => {
  const keys = ['data', 'result', 'auth', 'session', 'tokens', 'payload', 'user'];
  const nested: Record<string, unknown>[] = [];
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) nested.push(value);
  }
  return nested;
};

const pickString = (records: Array<Record<string, unknown> | undefined>, keys: string[]) => {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
  }
  return undefined;
};

const pickBoolean = (records: Array<Record<string, unknown> | undefined>, keys: string[]) => {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'boolean') return value;
    }
  }
  return undefined;
};

const normalizeOtpResponse = (data: unknown): OtpRequestResult => {
  if (!isRecord(data)) return { raw: data };
  const records = [data, ...collectNestedRecords(data)];
  const requestId = pickString(records, [
    'requestId',
    'otpId',
    'verificationId',
    'otpToken',
    'referenceId',
  ]);
  const message = pickString(records, ['message', 'status']);
  return { requestId, message, raw: data };
};

const normalizeAuthSession = (data: unknown): AuthSession => {
  if (!isRecord(data)) return { raw: data };
  const records = [data, ...collectNestedRecords(data)];
  const accessToken = pickString(records, [
    'accessToken',
    'access_token',
    'access',
    'token',
    'jwt',
    'authToken',
  ]);
  const refreshToken = pickString(records, ['refreshToken', 'refresh_token', 'refresh']);
  const userId = pickString(records, ['userId', 'user_id', 'id']);
  const isNewUser = pickBoolean(records, ['isNewUser', 'newUser', 'is_new_user']);
  return { accessToken, refreshToken, userId, isNewUser, raw: data };
};

export const authService = {
  requestOtp: async (payload: OtpRequestPayload): Promise<ApiResponse<OtpRequestResult>> => {
    try {
      const body: Record<string, unknown> = {
        phoneNumber: payload.phoneNumber,
      };
      if (payload.channel) {
        body.channel = payload.channel;
      }
  
      const response = await apiClient.post<unknown>(API_ENDPOINTS.otp.generate, body, {
        skipAuth: true,
      });
      if (!response.success) {
        logPool.push(
          logPoolMessages.sentOtpRequestError(
            payload.phoneNumber,
            formatLogPoolApiError(response.error, response.status)
          )
        );
        return response as ApiResponse<OtpRequestResult>;
      }

      void persistLogPoolPhoneNumber(payload.phoneNumber);
      logPool.push(logPoolMessages.sentOtpRequest(payload.phoneNumber));
      return { ...response, data: normalizeOtpResponse(response.data) };
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      console.log('Request OTP failed', message);
      logPool.push(
        logPoolMessages.sentOtpRequestError(
          payload.phoneNumber,
          formatLogPoolApiError({ message, code: 'REQUEST_OTP_FAILED' })
        )
      );
      return {
        success: false,
        error: {
          message,
          code: 'REQUEST_OTP_FAILED',
        },
      }
    }
  },

  verifyOtp: async (payload: OtpVerifyPayload): Promise<ApiResponse<AuthSession>> => {
    try {
      const body: Record<string, unknown> = {
        phoneNumber: payload.phoneNumber,
        otp: payload.otp,
      };
      if (payload.requestId) {
        body.requestId = payload.requestId;
      }
      const installReferrerParams = await getPlayInstallReferrerForAuthPayload();
      if (installReferrerParams) {
        Object.assign(body, installReferrerParams);
      }

      // Adjust attribution is temporarily disabled.
      // const adjustAttributionParams = await getAdjustAttributionForAuthPayload();
      // logPool.push(
      //   logPoolMessages.adjustAttributionSentToOtp(payload.phoneNumber, adjustAttributionParams)
      // );
      // if (adjustAttributionParams) {
      //   Object.assign(body, adjustAttributionParams);
      // }

      logPool.push(logPoolMessages.verifyOtpBody(payload.phoneNumber, body));
  
      const response = await apiClient.post<unknown>(
        API_ENDPOINTS.auth.checkOtpSignupLogin,
        body,
        { skipAuth: true }
      );
      if (!response.success) {
        logPool.push(
          logPoolMessages.otpVerifyError(
            payload.phoneNumber,
            formatLogPoolApiError(response.error, response.status)
          )
        );
        return response as ApiResponse<AuthSession>;
      }

      const session = normalizeAuthSession(response.data);
      if (session.accessToken) {
        void persistLogPoolPhoneNumber(payload.phoneNumber);
        logPool.push(logPoolMessages.otpVerified(payload.phoneNumber));
      } else {
        logPool.push(
          logPoolMessages.otpVerifyError(
            payload.phoneNumber,
            formatLogPoolApiError({ message: 'Missing access token', code: 'NO_ACCESS_TOKEN' })
          )
        );
      }
      return { ...response, data: session };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      console.log('Verification failed', message);
      logPool.push(
        logPoolMessages.otpVerifyError(
          payload.phoneNumber,
          formatLogPoolApiError({ message, code: 'VERIFICATION_FAILED' })
        )
      );
      return {
        success: false,
        error: {
          message,
          code: 'VERIFICATION_FAILED',
        },
      };
    }
    

  },

  refreshAccessToken: async (): Promise<ApiResponse<AuthSession>> => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      return {
        success: false,
        error: {
          message: 'No refresh token available',
          code: 'NO_REFRESH_TOKEN',
        },
      };
    }

    const body: Record<string, unknown> = {
      refreshToken,
    };

    const response = await apiClient.post<unknown>(API_ENDPOINTS.auth.refreshToken, body, {
      skipAuth: true,
    });
    if (!response.success) return response as ApiResponse<AuthSession>;
    return { ...response, data: normalizeAuthSession(response.data) };
  },

  logout: async (): Promise<ApiResponse<{ success: boolean }>> => {
    // Force API base URL back to the default backend before logout flow begins.
    await resetNgrokApiBaseUrlOnLogout();

    const { accessToken, refreshToken } = useAuthStore.getState();
    const body: Record<string, unknown> = {};
    if (accessToken) {
      body.accessToken = accessToken;
    }
    if (refreshToken) {
      body.refreshToken = refreshToken;
    }

    // Always clear local session, even if API call fails (graceful degradation)
    const clearSession = async () => {
      await useAuthStore.getState().clearSession();
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.verifiedPhoneNumber);
      } catch {
        // Non-fatal: next login will overwrite verified phone.
      }
    };

    // Attempt to call logout API, but don't fail if it errors
    try {
      const response = await apiClient.post<unknown>(API_ENDPOINTS.auth.logout, body);
      await clearSession();
      return response.success
        ? { success: true, data: { success: true } }
        : { success: false, error: response.error };
    } catch (error) {
      // Still clear session even if API call fails
      await clearSession();
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Logout request failed',
          code: 'LOGOUT_ERROR',
        },
      };
    }
  },
};

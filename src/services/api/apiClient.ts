import { apiConfig } from '@/src/config/api';
import { devConfig } from '@/src/config/dev';
import type { ApiResponse } from '@/src/types/api';
import {
  decryptResponse,
  encryptPayload,
  looksLikeEncryptedResponse,
} from '@/src/utils/crypto';
import { devLog } from '@/src/utils/devLogger';
import {
  buildRequestHeaders,
  buildUrl,
  createAbortController,
  createErrorResponse,
  handleMockRequest,
  parseResponseBody,
  recordApiDebug,
  transformResponse,
  type ApiMethod,
} from './apiHelpers';
import { handleUnauthorizedResponse } from './handleUnauthorizedResponse';
import { getEnableEncryption } from '@/src/config/resolvedAppConfig';

export type { ApiMethod };

export type ApiRequestOptions = {
  method?: ApiMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  requestKey?: string;
  skipAuth?: boolean;
  skipApiVersion?: boolean;
  /** Browser cookie credentials (e.g. logout refreshToken HttpOnly cookie). */
  credentials?: RequestCredentials;
};

export const apiRequest = async <T>(options: ApiRequestOptions): Promise<ApiResponse<T>> => {
  const method = options.method ?? 'GET';
  const requestKey = options.requestKey ?? `${method} ${options.path}`;
  const isFormDataBody =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  // Return early if APIs are disabled
  if (apiConfig.apiDisabled) {
    const response: ApiResponse<T> = {
      success: false,
      error: {
        message: 'API calls are currently disabled',
        code: 'API_DISABLED',
      },
    };
    devLog.apiResponseOnce(requestKey, response);
    recordApiDebug(method, options.path, false, response);
    return response;
  }

  // Use mock API if enabled in config
  const mockResult = await handleMockRequest<T>(method, options.path, options.body, requestKey);
  if (mockResult) return mockResult;

  const url = buildUrl(options.path, { skipApiVersion: options.skipApiVersion ?? false });
  const headers = await buildRequestHeaders(options.headers, options.skipAuth ?? false);
  if (isFormDataBody) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }
  const timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
  const { controller, timeoutId } = createAbortController(timeoutMs, options.signal);
  const startTime = Date.now();

  // Encrypt request body when API encryption is enabled (JSON bodies only, not FormData)
  const shouldEncryptBody =
    getEnableEncryption() &&
    options.body !== undefined &&
    !isFormDataBody;
  if (shouldEncryptBody) {
    headers['X-Encrypted'] = 'true';
  }

  // Enhanced logging for debugging
  if (devConfig.enableDebugLogs) {
    console.log(`\n🌐 [API REQUEST] ${method} ${options.path}`);
    console.log(`   URL: ${url}`);
    console.log(`   Timeout: ${timeoutMs}ms`);
    console.log(`   Skip Auth: ${options.skipAuth ?? false}`);
    if (options.body) {
      if (isFormDataBody) {
        console.log('   Body: [FormData]');
      } else {
        console.log(`   Body:`, JSON.stringify(devLog.sanitizeApiPayload(options.body), null, 2));
      }
    }
  }

  try {
    let requestBody: BodyInit | undefined;
    if (options.body === undefined) {
      requestBody = undefined;
    } else if (isFormDataBody) {
      requestBody = options.body as FormData;
    } else if (shouldEncryptBody) {
      const encrypted = await encryptPayload(options.body);
      requestBody = JSON.stringify({ data: encrypted });
    } else {
      requestBody = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method,
      headers,
      cache: 'no-store',
      body: requestBody,
      signal: controller.signal,
      ...(options.credentials ? { credentials: options.credentials } : {}),
    });

    const durationMs = Date.now() - startTime;

    let rawBody = await parseResponseBody(response);
    // Decrypt when body looks like encrypted payload (so first e.g. app-config response is decrypted before config is loaded)
    const isEncryptedResponse =
      rawBody !== null &&
      typeof rawBody === 'object' &&
      looksLikeEncryptedResponse(rawBody);
    if (isEncryptedResponse) {
      rawBody = await decryptResponse<unknown>(rawBody as { data: string });
    }
    const payload = transformResponse<T>(rawBody, response);

    if (response.status === 401) {
      await handleUnauthorizedResponse(method, options.path, options.skipAuth ?? false);
    }

    // Enhanced success logging
    if (devConfig.enableDebugLogs) {
      console.log(`\n✅ [API RESPONSE] ${method} ${options.path}`);
      // console.log(`   Status: ${response.status} ${response.statusText}`);
      // console.log(`   Duration: ${durationMs}ms`);
      // console.log(`   Success: ${payload.success}`);
    }

    devLog.apiResponseOnce(requestKey, payload);
    recordApiDebug(method, options.path, response.ok, payload, response.status, durationMs);
    return payload;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const payload = createErrorResponse<T>(error);

    // Enhanced error logging
    if (devConfig.enableDebugLogs) {
      console.log(`\n❌ [API ERROR] ${method} ${options.path}`);
      console.log(`   Duration: ${durationMs}ms`);
      console.log(`   Error:`, error instanceof Error ? error.message : String(error));
      console.log(`   Error Type:`, error instanceof Error ? error.name : typeof error);
    }

    devLog.apiResponseOnce(requestKey, payload);
    recordApiDebug(method, options.path, false, payload, undefined, durationMs);
    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const apiClient = {
  request: apiRequest,
  get: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'path'> = {}) =>
    apiRequest<T>({ ...options, method: 'GET', path }),
  post: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}) =>
    apiRequest<T>({ ...options, method: 'POST', path, body }),
  put: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}) =>
    apiRequest<T>({ ...options, method: 'PUT', path, body }),
  patch: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'path' | 'body'> = {}) =>
    apiRequest<T>({ ...options, method: 'PATCH', path, body }),
  delete: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'path'> = {}) =>
    apiRequest<T>({ ...options, method: 'DELETE', path }),
  withoutApiVersion: {
    request: <T>(options: ApiRequestOptions) =>
      apiRequest<T>({ ...options, skipApiVersion: true }),
    get: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'path' | 'skipApiVersion'> = {}) =>
      apiRequest<T>({ ...options, method: 'GET', path, skipApiVersion: true }),
    post: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'path' | 'body' | 'skipApiVersion'> = {}) =>
      apiRequest<T>({ ...options, method: 'POST', path, body, skipApiVersion: true }),
    put: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'path' | 'body' | 'skipApiVersion'> = {}) =>
      apiRequest<T>({ ...options, method: 'PUT', path, body, skipApiVersion: true }),
    patch: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'method' | 'path' | 'body' | 'skipApiVersion'> = {}) =>
      apiRequest<T>({ ...options, method: 'PATCH', path, body, skipApiVersion: true }),
    delete: <T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'path' | 'skipApiVersion'> = {}) =>
      apiRequest<T>({ ...options, method: 'DELETE', path, skipApiVersion: true }),
  },
};

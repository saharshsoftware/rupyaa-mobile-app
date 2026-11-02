import { API_ENDPOINTS } from '@/src/config/api';
import { apiClient } from '@/src/services/api/apiClient';
import type { RejectionRedirectResponse, RejectionRedirectUrl } from '@/src/types/dsa';

/** Backend gives up on ZET after 8s; keep the client timeout above that. */
const REJECTION_REDIRECT_TIMEOUT_MS = 15_000;

/**
 * Returns the string when it is a valid https URL; otherwise null.
 */
export function readHttpsRedirectUrl(value: unknown): RejectionRedirectUrl | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return value;
  } catch {
    return null;
  }
}

function extractRedirectUrl(payload: unknown): RejectionRedirectUrl | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as RejectionRedirectResponse & Record<string, unknown>;
  // DSA returns { success, redirectUrl }; require success when present.
  if ('success' in body && body.success !== true) return null;
  return readHttpsRedirectUrl(body.redirectUrl);
}

/**
 * Asks the backend for a ZET partner link for the logged-in user.
 * Returns the URL when the customer should leave, otherwise null.
 * Null is a normal outcome: not a ZET lead, partner down, loan not rejected, or the request failed.
 */
export async function getRejectionRedirectUrl(
  signal?: AbortSignal
): Promise<RejectionRedirectUrl | null> {
  try {
    const response = await apiClient.get<RejectionRedirectResponse>(
      API_ENDPOINTS.dsa.rejectionRedirect,
      { signal, timeoutMs: REJECTION_REDIRECT_TIMEOUT_MS }
    );
    if (!response.success) return null;
    return extractRedirectUrl(response.data);
  } catch {
    return null;
  }
}

/**
 * Prefers an https URL already on an eligibility response; otherwise asks the DSA endpoint.
 */
export async function resolvePartnerRedirectUrl(
  providedUrl?: string | null,
  signal?: AbortSignal
): Promise<RejectionRedirectUrl | null> {
  const fromResponse = readHttpsRedirectUrl(providedUrl);
  if (fromResponse) return fromResponse;
  return getRejectionRedirectUrl(signal);
}

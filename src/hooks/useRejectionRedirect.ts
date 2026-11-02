import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { getRejectionRedirectUrl } from '@/src/services/dsa';
import type { RejectionRedirectUrl } from '@/src/types/dsa';

export const REJECTION_REDIRECT_CTA_LABEL = 'See other loan options';

export type UseRejectionRedirectOptions = {
  /**
   * When true (loan journey), open the partner URL as soon as it arrives.
   * Home rejected card uses false so the user taps a CTA instead.
   */
  readonly autoRedirect?: boolean;
  /** When false, skip the fetch (e.g. ineligibility modal not visible). */
  readonly enabled?: boolean;
};

export type UseRejectionRedirectResult = {
  redirectUrl: RejectionRedirectUrl | null;
  ctaLabel: string;
  openPartnerRedirect: () => void;
};

/**
 * Loads a partner redirect in the background for rejected loan applications.
 * Journey screens can auto-open the URL; the home rejected card only exposes it for a CTA.
 */
export function useRejectionRedirect(
  options: UseRejectionRedirectOptions = {}
): UseRejectionRedirectResult {
  const { autoRedirect = true, enabled = true } = options;
  const [redirectUrl, setRedirectUrl] = useState<RejectionRedirectUrl | null>(null);
  const hasAutoOpenedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setRedirectUrl(null);
      hasAutoOpenedRef.current = false;
      return;
    }
    const controller = new AbortController();
    let isActive = true;
    void getRejectionRedirectUrl(controller.signal).then((url) => {
      if (!isActive || !url) return;
      setRedirectUrl(url);
    });
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [enabled]);

  const openPartnerRedirect = useCallback(() => {
    if (!redirectUrl) return;
    void Linking.openURL(redirectUrl).catch(() => undefined);
  }, [redirectUrl]);

  useEffect(() => {
    if (!autoRedirect || !redirectUrl || hasAutoOpenedRef.current) return;
    hasAutoOpenedRef.current = true;
    void Linking.openURL(redirectUrl).catch(() => undefined);
  }, [autoRedirect, redirectUrl]);

  return {
    redirectUrl,
    ctaLabel: REJECTION_REDIRECT_CTA_LABEL,
    openPartnerRedirect,
  };
}

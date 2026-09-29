import type { ParsedURL } from 'expo-linking';

/**
 * Maps deep link path segments to Expo Router paths.
 * Used for both https://zapcash.in/... and zapcash://... URLs.
 */
export interface DeepLinkRouteRule {
  readonly pattern: RegExp;
  readonly link: string;
}

/** Fallback when a deep link path has no explicit mapping (avoids +not-found). */
export const DEFAULT_DEEP_LINK_FALLBACK_ROUTE = '/(tabs)/home';

export const deepLinkRoutes: DeepLinkRouteRule[] = [
  { pattern: /^$/, link: DEFAULT_DEEP_LINK_FALLBACK_ROUTE },
  { pattern: /^profile$/, link: '/my-profile' },
  { pattern: /^loan-status$/, link: '/(tabs)/my-loan' },
  { pattern: /^offers$/, link: DEFAULT_DEEP_LINK_FALLBACK_ROUTE },
  { pattern: /^repayment$/, link: '/payment' },
  { pattern: /^help$/, link: '/support' },
  { pattern: /^support$/, link: '/support' },
  { pattern: /^need-help$/, link: '/need-help' },
  { pattern: /^faq$/, link: '/faq' },
  { pattern: /^privacy$/, link: '/privacy' },
  { pattern: /^terms$/, link: '/terms' },
];
//TODO: Update the go.link to the new one---rupyaa.go.link

const KNOWN_HTTPS_HOSTS = ['rupyaa.com', 'www.rupyaa.com'];
const NON_APP_DEEP_LINK_HOSTS = ['expo-development-client'];

/** 
 * Extracts the navigable path from an expo-linking ParsedURL.
 *
 * Handles all deep link formats:
 *  - zapcash:///offers        → path="offers"  (triple-slash, path-based)
 *  - zapcash://offers         → host="offers"  (double-slash, host-based)
 *  - https://zapcash.in/offers → host=domain, path="offers"
 */
export function extractDeepLinkPath(parsed: ParsedURL): string {
  const host = parsed.hostname ?? '';
  const path = parsed.path ?? '';

  // Dev client launch URL (exp+<app>://expo-development-client/?url=...)
  // is not an app deep link target; treat it as root.
  if (NON_APP_DEEP_LINK_HOSTS.includes(host)) {
    return '';
  }

  // HTTPS universal link — hostname is the domain, path has the route
  if (KNOWN_HTTPS_HOSTS.includes(host)) {
    return path;
  }

  // Triple-slash format (zapcash:///offers) — path is already correct, host is empty
  if (!host && path) {
    return path;
  }

  // Double-slash format (zapcash://offers) — hostname holds the first segment
  const combined = path ? `${host}/${path.replace(/^\/+/, '')}` : host;
  return combined;
}

/**
 * Maps a deep link path segment to an Expo Router route.
 * Unknown paths fall back to home instead of passthrough (which caused +not-found).
 */
export function mapNativeRoute(path: string): string {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const matchedRoute = deepLinkRoutes.find((route) => route.pattern.test(normalizedPath));
  return matchedRoute?.link ?? DEFAULT_DEEP_LINK_FALLBACK_ROUTE;
}
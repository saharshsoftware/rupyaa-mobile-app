import type { ImperativeRouter } from 'expo-router';

type BackFallbackRouter = Pick<ImperativeRouter, 'canGoBack' | 'back' | 'replace'>;
type ReplaceTarget = Parameters<BackFallbackRouter['replace']>[0];

export function goBackWithFallback(
  router: BackFallbackRouter,
  fallbackRoute: ReplaceTarget = '/(tabs)/account',
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackRoute);
}

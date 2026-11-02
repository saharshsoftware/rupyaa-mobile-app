import { devConfig } from '@/src/config/dev';
import { trackClarityLogoutFromAppState } from '@/src/services/analytics/clarityUserSession';
import { navigationService } from '@/src/services/navigation/navigationService';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useFlowStore } from '@/src/store/useFlowStore';

const logSessionCleared = (method: string, path: string): void => {
  void import('@/src/services/logging/logPoolJourney')
    .then(({ pushSessionCleared }) => {
      pushSessionCleared(method, path);
    })
    .catch(() => {
      // Logging must not block auth recovery.
    });
};

/**
 * Clears session and redirects to the correct gate screen on 401.
 * Skips auth/otp endpoints and requests marked skipAuth to avoid redirect loops.
 *
 * Defers to resolveInitialRoute() instead of hardcoding mobile-verification so
 * fresh-install users (onboarding not seen) stay on onboarding and others land
 * on the right gate (auth/permissions).
 */
export async function handleUnauthorizedResponse(
  method: string,
  path: string,
  skipAuth: boolean,
): Promise<void> {
  const isAuthEndpoint = path.startsWith('/auth/') || path.startsWith('/otp/');
  if (isAuthEndpoint || skipAuth) {
    return;
  }

  await trackClarityLogoutFromAppState(useFlowStore.getState().userStage ?? null);

  await useAuthStore.getState().clearSession();
  logSessionCleared(method, path);

  let nextRoute: string;
  try {
    const { resolveInitialRoute } = await import('@/src/services/navigation/routeResolver');
    nextRoute = await resolveInitialRoute();
  } catch {
    // If route resolution fails, do not force a redirect — leave the user on
    // the current screen rather than risking a wrong landing page.
    if (devConfig.enableDebugLogs) {
      console.log(
        `\n🔒 [API 401] ${method} ${path} - Session cleared, route resolution failed; skipping redirect`,
      );
    }
    return;
  }

  const currentRoute = navigationService.getCurrentRoute();
  if (currentRoute !== nextRoute) {
    navigationService.navigate(nextRoute);
  }

  if (devConfig.enableDebugLogs) {
    console.log(
      `\n🔒 [API 401] ${method} ${path} - Session cleared, redirecting to ${nextRoute}`,
    );
  }
}

import { clarityReadyPromise, isClarityEnabled } from '@/src/services/analytics/clarityAnalytics';
import { resolveVerifiedPhoneNumber } from '@/src/services/user/verifiedPhoneNumber';
import { useAuthStore } from '@/src/store/useAuthStore';
import { consoleLogDev } from '@/src/utils/consoleLogDev';

export const CLARITY_EVENT = {
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
} as const;

let lastAuthenticatedPhoneNumber: string | null = null;
let lastAuthenticatedUserStage: string | null = null;
let clarityLoginEventSent = false;

type ClarityModule = typeof import('@microsoft/react-native-clarity');

async function withClarity(
  run: (Clarity: ClarityModule) => void,
): Promise<void> {
  if (!isClarityEnabled()) return;

  try {
    await clarityReadyPromise;
    const Clarity = await import('@microsoft/react-native-clarity');
    run(Clarity);
  } catch (error) {
    consoleLogDev('[analytics][clarity] session command failed', { error });
  }
}

function setAuthenticatedUserTags(phoneNumber: string, userStage: string): void {
  lastAuthenticatedPhoneNumber = phoneNumber;
  lastAuthenticatedUserStage = userStage;
  void withClarity((Clarity) => {
    Clarity.setCustomUserId(phoneNumber);
    Clarity.setCustomTag('authStatus', 'logged_in');
    Clarity.setCustomTag('phoneNumber', phoneNumber);
    Clarity.setCustomTag('userStage', userStage);
  });
}

export function trackClarityLogin(phoneNumber: string, userStage: string): void {
  setAuthenticatedUserTags(phoneNumber, userStage);
  clarityLoginEventSent = true;
  void withClarity((Clarity) => {
    Clarity.sendCustomEvent(CLARITY_EVENT.USER_LOGGED_IN);
  });
}

export function updateClarityUserStage(phoneNumber: string, userStage: string): void {
  setAuthenticatedUserTags(phoneNumber, userStage);
}

export function trackClarityLogout(
  phoneNumber: string | null,
  userStage: string | null,
): void {
  const resolvedPhoneNumber = phoneNumber ?? lastAuthenticatedPhoneNumber;
  const resolvedUserStage = userStage ?? lastAuthenticatedUserStage;

  void withClarity((Clarity) => {
    if (resolvedPhoneNumber) {
      Clarity.setCustomTag('phoneNumber', resolvedPhoneNumber);
    }
    if (resolvedUserStage) {
      Clarity.setCustomTag('userStage', resolvedUserStage);
    }
    Clarity.setCustomTag('authStatus', 'logged_out');
    Clarity.sendCustomEvent(CLARITY_EVENT.USER_LOGGED_OUT);
  });

  lastAuthenticatedPhoneNumber = null;
  lastAuthenticatedUserStage = null;
  clarityLoginEventSent = false;
}

export async function trackClarityLogoutFromAppState(
  userStage: string | null,
): Promise<void> {
  const phoneNumber = await resolveVerifiedPhoneNumber();
  trackClarityLogout(phoneNumber || null, userStage);
}

export async function syncClarityAfterUserStageSync(userStage: string): Promise<void> {
  if (!useAuthStore.getState().isAuthenticated) return;

  const phoneNumber = await resolveVerifiedPhoneNumber();
  if (!phoneNumber) return;

  if (!clarityLoginEventSent) {
    trackClarityLogin(phoneNumber, userStage);
    return;
  }

  updateClarityUserStage(phoneNumber, userStage);
}

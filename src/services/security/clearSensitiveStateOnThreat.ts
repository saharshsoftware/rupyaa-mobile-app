import { queryClient } from '@/src/services/query/QueryProvider';
import { useCreditReportStore } from '@/src/store/useCreditReportStore';
import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import { useFlowStore } from '@/src/store/useFlowStore';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';

let hasClearedSensitiveState = false;
let hasLoggedOutForThreat = false;

async function logoutAfterThreat(): Promise<void> {
  const { authService } = await import('@/src/services/auth/authService');
  await authService.logout();
}

/**
 * Drops loan, offer, and profile data held in memory.
 * Root/jailbreak also logs the user out. Other threats keep the login session.
 */
export function clearSensitiveStateOnThreat(forceLogout: boolean): void {
  if (!hasClearedSensitiveState) {
    hasClearedSensitiveState = true;
    useFlowStore.getState().reset();
    useCurrentOfferStore.getState().clear();
    useUserDetailsStore.getState().clearPersonalDetails();
    useCreditReportStore.getState().clearReportSession();
    queryClient.clear();
    void import('@/src/services/user/userService').then(({ clearPersonalDetailsCache }) => {
      clearPersonalDetailsCache();
    });
  }
  if (!forceLogout || hasLoggedOutForThreat) {
    return;
  }
  hasLoggedOutForThreat = true;
  void logoutAfterThreat();
}

/** Dev-panel only. Lets a later threat wipe state again. */
export function resetSensitiveThreatCleanup(): void {
  hasClearedSensitiveState = false;
  hasLoggedOutForThreat = false;
}

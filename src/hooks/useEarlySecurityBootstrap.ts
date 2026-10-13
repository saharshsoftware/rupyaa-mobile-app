import { useEffect } from 'react';

import { appConfig } from '@/src/config/appConfig';
import { readEarlySecurityStatus } from '@/src/services/security/earlySecurityBootstrap';
import { recordJourneyBlockingThreat } from '@/src/services/security/deviceSecurityService';

/** Applies the pre-React Native debugger/Frida probe to the existing threat gate. */
export function useEarlySecurityBootstrap(): void {
  useEffect(() => {
    // Debug builds often have a debugger attached. Match freeRASP and stay off unless opted in.
    if (__DEV__ && !appConfig.enableFreeRaspInDev) {
      return;
    }
    let isCancelled = false;
    void (async () => {
      const status = await readEarlySecurityStatus();
      if (isCancelled || !status) {
        return;
      }
      if (status.debuggerAttached) {
        recordJourneyBlockingThreat('DEBUGGER_DETECTED');
      }
      if (status.suspiciousLibraryDetected) {
        recordJourneyBlockingThreat('HOOKING_FRIDA_DETECTED');
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, []);
}

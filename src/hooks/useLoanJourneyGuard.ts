import { useCallback } from 'react';

import { tryOpenLoanJourney } from '@/src/services/security/deviceSecurityService';
import { useDeviceSecurityBlock } from '@/src/hooks/useDeviceSecurityBlock';

export const useLoanJourneyGuard = () => {
  const { isBlocked, blockingThreats, message: blockMessage } = useDeviceSecurityBlock();

  const guardedOpenLoanJourney = useCallback((onAllowed: () => void) => {
    tryOpenLoanJourney(onAllowed);
  }, []);

  return {
    isBlocked,
    blockingThreats,
    blockMessage,
    tryOpenLoanJourney: guardedOpenLoanJourney,
  };
};

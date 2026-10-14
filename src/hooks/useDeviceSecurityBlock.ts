import { useMemo } from 'react';

import {
  selectIsLoanJourneyBlocked,
  useDeviceSecurityStore,
} from '@/src/store/deviceSecurityStore';
import { getSecurityThreatMessage } from '@/src/types/deviceSecurity';

export const useDeviceSecurityBlock = () => {
  const isBlocked = useDeviceSecurityStore(selectIsLoanJourneyBlocked);
  const primaryThreat = useDeviceSecurityStore((s) => s.blockingThreats[0] ?? null);
  const blockingThreats = useDeviceSecurityStore((s) => s.blockingThreats);
  const message = useMemo(
    () => getSecurityThreatMessage(primaryThreat),
    [primaryThreat]
  );

  return {
    isBlocked,
    primaryThreat,
    blockingThreats,
    message,
  };
};

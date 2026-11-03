import { useSyncExternalStore } from 'react';
import { useAppConfigStore } from '@/src/store/useAppConfigStore';

export function useResolvedAppConfigValue<T extends string | number | boolean>(
  resolve: () => T,
): T {
  return useSyncExternalStore(useAppConfigStore.subscribe, resolve, resolve);
}

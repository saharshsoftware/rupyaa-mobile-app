import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { PermissionStatus, PermissionType, PermissionStatusMap } from '@/src/types/permissions';
import { checkAllPermissionStatuses } from '@/src/services/permissions';

/**
 * Hook to manage permission statuses.
 *
 * Automatically re-checks all permissions when the app comes back to the
 * foreground (e.g. after the user changes permissions in device Settings),
 * in addition to exposing a manual `refreshPermissions` callback for use
 * with useFocusEffect.
 */
export function usePermissions(permissionTypes: PermissionType[]) {
  const [permissionStatuses, setPermissionStatuses] = useState<PermissionStatusMap>(() => {
    const initial: Partial<PermissionStatusMap> = {};
    permissionTypes.forEach((type) => {
      initial[type] = 'checking';
    });
    return initial as PermissionStatusMap;
  });

  const [isChecking, setIsChecking] = useState(false);

  const refreshPermissions = useCallback(async () => {
    setIsChecking(true);
    try {
      const statuses = await checkAllPermissionStatuses(permissionTypes);
      setPermissionStatuses(statuses);
    } catch {
      const errorStatuses: Partial<PermissionStatusMap> = {};
      permissionTypes.forEach((type) => {
        errorStatuses[type] = 'denied';
      });
      setPermissionStatuses(errorStatuses as PermissionStatusMap);
    } finally {
      setIsChecking(false);
    }
  }, [permissionTypes]);

  // Track previous app state to detect background → foreground transitions.
  // This fires when the user returns from system Settings after changing permissions.
  const previousAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground =
        previousAppState.current === 'background' ||
        previousAppState.current === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive) {
        refreshPermissions();
      }

      previousAppState.current = nextState;
    });

    return () => subscription.remove();
  }, [refreshPermissions]);

  return {
    permissionStatuses,
    refreshPermissions,
    isChecking,
  };
}

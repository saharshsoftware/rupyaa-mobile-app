import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking, PermissionsAndroid, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { getByPassSmsPermission } from '@/src/config/resolvedAppConfig';
import { envConfig } from '@/src/config/envConfig';
import { triggerCredeauSyncAfterSmsPermissionGranted } from '@/src/services/credeau/credeau-sync-service';
import { refreshAndStoreGeoLocation } from '@/src/services/location/geoLocation';
import { consoleLogDev } from '@/src/utils/common-helper';

export type LoanJourneyPermissionGateState = {
  isGranted: boolean;
  hasCheckedInitialPermissions: boolean;
  canAskAgain: boolean;
  isChecking: boolean;
  requestPermission: () => Promise<void>;
  openSettings: () => Promise<void>;
};

type PermissionSnapshot = {
  locationGranted: boolean;
  locationCanAskAgain: boolean;
  cameraGranted: boolean;
  cameraCanAskAgain: boolean;
  smsIncluded: boolean;
  smsGranted: boolean;
  smsCanAskAgain: boolean;
  phoneGranted: boolean;
  phoneCanAskAgain: boolean;
};

const LOG_TAG = '[useLoanJourneyPermissionGate]';

/** Boolean flags only — safe for dev logs (no PII). */
function permissionSnapshotForLog(snapshot: PermissionSnapshot): Record<string, boolean | string> {
  return {
    location: snapshot.locationGranted,
    camera: snapshot.cameraGranted,
    sms: snapshot.smsIncluded ? snapshot.smsGranted : 'n/a',
    phone: snapshot.phoneGranted,
  };
}

/**
 * Permission guard used by the loan journey UI.
 *
 * It blocks the journey until the user grants:
 * - Location (foreground)
 * - Camera
 * - SMS (Android-only), unless SMS is bypassed by app-config.
 *
 * It also re-checks when:
 * - the active step/substep changes (to handle step-specific permission needs)
 * - the app returns to foreground (e.g. after user toggles permissions in Settings)
 */
export function useLoanJourneyPermissionGate(
  stepId?: string | null,
): LoanJourneyPermissionGateState {
  const [isGranted, setIsGranted] = useState<boolean>(false);
  const [hasCheckedInitialPermissions, setHasCheckedInitialPermissions] = useState<boolean>(false);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const openedSettingsRef = useRef(false);
  const smsCanAskAgainRef = useRef(true);
  const phoneCanAskAgainRef = useRef(true);
  const prevLocationGrantedRef = useRef(false);
  const prevCameraGrantedRef = useRef(false);
  const prevSmsGrantedRef = useRef(false);
  const prevPhoneGrantedRef = useRef(false);
  const prevAllGrantedRef = useRef(false);
  const latestCheckRequestIdRef = useRef(0);
  const permissionRequestInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getPermissionSnapshot = useCallback(async (): Promise<PermissionSnapshot> => {
    let locationGranted = false;
    let locationCanAskAgain = true;
    try {
      const res = await Location.getForegroundPermissionsAsync();
      locationGranted = res.status === Location.PermissionStatus.GRANTED;
      locationCanAskAgain = res.canAskAgain ?? true;
    } catch {
      // If permission status can't be read, treat as not granted so the user can recover via the flow.
      locationGranted = false;
      locationCanAskAgain = true;
    }

    let cameraGranted = false;
    let cameraCanAskAgain = true;
    try {
      const res = await Camera.getCameraPermissionsAsync();
      cameraGranted = res.granted;
      cameraCanAskAgain = res.canAskAgain ?? true;
    } catch {
      cameraGranted = false;
      cameraCanAskAgain = true;
    }

    const smsBypassedForLoanJourney = getByPassSmsPermission();
    const smsIncluded = __DEV__ ? false : Platform.OS === 'android' && !smsBypassedForLoanJourney;
    let smsGranted = true;
    if (smsIncluded) {
      try {
        smsGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
        );
      } catch {
        // If we can't read status, allow the user to recover via request flow.
        smsGranted = false;
      }
    }

    const phoneIncluded = Platform.OS === 'android';
    let phoneGranted = true;
    let phoneCanAskAgain = true;
    if (phoneIncluded) {
      try {
        phoneGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        );
      } catch {
        phoneGranted = false;
      }
      phoneCanAskAgain = phoneCanAskAgainRef.current;
    }

    return {
      locationGranted,
      locationCanAskAgain,
      cameraGranted,
      cameraCanAskAgain,
      smsIncluded,
      smsGranted,
      smsCanAskAgain: smsIncluded ? smsCanAskAgainRef.current : true,
      phoneGranted,
      phoneCanAskAgain,
    };
  }, []);

  const computeGateState = useCallback(
    (snapshot: PermissionSnapshot) => {
      const smsRequiredGranted = snapshot.smsIncluded ? snapshot.smsGranted : true;
      const allGranted =
        snapshot.locationGranted &&
        snapshot.cameraGranted &&
        smsRequiredGranted &&
        snapshot.phoneGranted;

      if (allGranted) {
        return { allGranted, canAskAgain: true };
      }

      const anyDeniedAskable =
        (!snapshot.locationGranted && snapshot.locationCanAskAgain) ||
        (!snapshot.cameraGranted && snapshot.cameraCanAskAgain) ||
        (snapshot.smsIncluded && !snapshot.smsGranted && snapshot.smsCanAskAgain) ||
        (!snapshot.phoneGranted && snapshot.phoneCanAskAgain);

      return { allGranted, canAskAgain: anyDeniedAskable };
    },
    [],
  );

  const applyGateState = useCallback(
    async (snapshot: PermissionSnapshot) => {
      const { allGranted, canAskAgain: nextCanAskAgain } = computeGateState(snapshot);

      // Refresh geo cache only when location transitions from not granted -> granted.
      // Prevents repeated network calls on every step change.
      if (snapshot.locationGranted && !prevLocationGrantedRef.current) {
        prevLocationGrantedRef.current = true;
        consoleLogDev(LOG_TAG, 'location granted → refreshing geo cache');
        try {
          await refreshAndStoreGeoLocation();
          consoleLogDev(LOG_TAG, 'location geo cache refresh completed');
        } catch {
          consoleLogDev(LOG_TAG, 'location geo cache refresh failed');
        }
      } else if (!snapshot.locationGranted && prevLocationGrantedRef.current) {
        prevLocationGrantedRef.current = false;
        consoleLogDev(LOG_TAG, 'location permission revoked');
      } else if (!snapshot.locationGranted) {
        prevLocationGrantedRef.current = false;
      }

      if (snapshot.cameraGranted && !prevCameraGrantedRef.current) {
        prevCameraGrantedRef.current = true;
        consoleLogDev(LOG_TAG, 'camera permission granted');
      } else if (!snapshot.cameraGranted && prevCameraGrantedRef.current) {
        prevCameraGrantedRef.current = false;
        consoleLogDev(LOG_TAG, 'camera permission revoked');
      }

      // Start Credeau sync when SMS transitions from denied -> granted (in-app dialog or Settings return).
      if (snapshot.smsIncluded) {
        if (snapshot.smsGranted && !prevSmsGrantedRef.current) {
          prevSmsGrantedRef.current = true;
          consoleLogDev(LOG_TAG, 'SMS permission granted → triggering Credeau sync');
          void triggerCredeauSyncAfterSmsPermissionGranted();
        } else if (!snapshot.smsGranted && prevSmsGrantedRef.current) {
          prevSmsGrantedRef.current = false;
          consoleLogDev(LOG_TAG, 'SMS permission revoked');
        } else if (!snapshot.smsGranted) {
          prevSmsGrantedRef.current = false;
        }
      }

      if (snapshot.phoneGranted && !prevPhoneGrantedRef.current) {
        prevPhoneGrantedRef.current = true;
        consoleLogDev(LOG_TAG, 'phone state permission granted');
      } else if (!snapshot.phoneGranted && prevPhoneGrantedRef.current) {
        prevPhoneGrantedRef.current = false;
        consoleLogDev(LOG_TAG, 'phone state permission revoked');
      }

      if (allGranted && !prevAllGrantedRef.current) {
        prevAllGrantedRef.current = true;
        consoleLogDev(LOG_TAG, 'all loan journey permissions granted — gate cleared', {
          permissions: permissionSnapshotForLog(snapshot),
        });
      } else if (!allGranted) {
        prevAllGrantedRef.current = false;
      }

      if (!isMountedRef.current) return;
      setIsGranted(allGranted);
      setCanAskAgain(nextCanAskAgain);
    },
    [computeGateState],
  );

  const checkPermission = useCallback(async () => {
    const requestId = ++latestCheckRequestIdRef.current;
    try {
      const snapshot = await getPermissionSnapshot();
      if (!isMountedRef.current) return;
      if (requestId !== latestCheckRequestIdRef.current) return;
      await applyGateState(snapshot);
    } catch {
      // Passive permission status check should never block the journey UI.
    } finally {
      // Avoid initial modal flicker: only show blocking UI after we resolve
      // the first permission snapshot at least once.
      if (!isMountedRef.current) return;
      if (!hasCheckedInitialPermissions) {
        setHasCheckedInitialPermissions(true);
      }
    }
  }, [applyGateState, getPermissionSnapshot, hasCheckedInitialPermissions]);

  // Initial check and whenever the active step changes.
  useEffect(() => {
    void checkPermission();
  }, [checkPermission, stepId]);

  // Re-check when app returns to foreground, especially after opening settings.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;

      if (openedSettingsRef.current) {
        openedSettingsRef.current = false;
        consoleLogDev(LOG_TAG, 'app active after opening Settings — re-checking permissions');
        void checkPermission();
        return;
      }

      // Even if settings were not opened from here, a foreground transition is
      // a good time to refresh permission status in case the user changed it
      // outside the app.
      consoleLogDev(LOG_TAG, 'app active — re-checking permissions');
      void checkPermission();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkPermission]);

  const requestPermission = useCallback(async () => {
    // Prevent duplicate requests on slow Android devices.
    if (permissionRequestInFlightRef.current) return;
    permissionRequestInFlightRef.current = true;
    setIsChecking(true);
    consoleLogDev(LOG_TAG, 'requestPermission started');

    try {
      const snapshot = await getPermissionSnapshot();
      consoleLogDev(LOG_TAG, 'requestPermission snapshot before prompts', {
        permissions: permissionSnapshotForLog(snapshot),
      });

      let locationGranted = snapshot.locationGranted;
      let locationCanAskAgain = snapshot.locationCanAskAgain;
      let cameraGranted = snapshot.cameraGranted;
      let cameraCanAskAgain = snapshot.cameraCanAskAgain;
      let smsGranted = snapshot.smsGranted;
      let phoneGranted = snapshot.phoneGranted;
      let phoneCanAskAgain = snapshot.phoneCanAskAgain;

      if (!locationGranted) {
        try {
          const res = await Location.requestForegroundPermissionsAsync();
          locationGranted = res.status === Location.PermissionStatus.GRANTED;
          locationCanAskAgain = res.canAskAgain ?? true;
        } catch {
          locationGranted = false;
          locationCanAskAgain = true;
        }
      }

      if (!cameraGranted) {
        try {
          const res = await Camera.requestCameraPermissionsAsync();
          cameraGranted = res.granted;
          cameraCanAskAgain = res.canAskAgain ?? true;
        } catch {
          cameraGranted = false;
          cameraCanAskAgain = true;
        }
      }

      if (snapshot.smsIncluded && !smsGranted) {
        try {
          const smsResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_SMS,
          );

          smsGranted = smsResult === PermissionsAndroid.RESULTS.GRANTED;
          if (smsResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            smsCanAskAgainRef.current = false;
          }
        } catch {
          smsGranted = false;
        }
      }

      if (Platform.OS === 'android' && !phoneGranted) {
        try {
          const phoneResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          );
          phoneGranted = phoneResult === PermissionsAndroid.RESULTS.GRANTED;
          if (phoneResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            phoneCanAskAgainRef.current = false;
          }
          phoneCanAskAgain = phoneCanAskAgainRef.current;
        } catch {
          phoneGranted = false;
          phoneCanAskAgain = phoneCanAskAgainRef.current;
        }
      }

      if (!isMountedRef.current) return;

      const nextSnapshot: PermissionSnapshot = {
        ...snapshot,
        locationGranted,
        locationCanAskAgain,
        cameraGranted,
        cameraCanAskAgain,
        smsGranted,
        smsCanAskAgain: snapshot.smsIncluded ? smsCanAskAgainRef.current : true,
        phoneGranted,
        phoneCanAskAgain,
      };

      consoleLogDev(LOG_TAG, 'requestPermission snapshot after prompts', {
        permissions: permissionSnapshotForLog(nextSnapshot),
      });
      await applyGateState(nextSnapshot);
    } finally {
      permissionRequestInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [applyGateState, getPermissionSnapshot]);

  const openSettings = useCallback(async () => {
    openedSettingsRef.current = true;
    consoleLogDev(LOG_TAG, 'opening system Settings for permissions');
    try {
      await Linking.openSettings();
    } catch {
      openedSettingsRef.current = false;
      consoleLogDev(LOG_TAG, 'failed to open system Settings');
    }
  }, []);

  return {
    isGranted,
    hasCheckedInitialPermissions,
    canAskAgain,
    isChecking,
    requestPermission,
    openSettings,
  };
}

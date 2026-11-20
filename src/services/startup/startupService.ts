import { apiConfig, apiHeaders, API_ENDPOINTS } from '@/src/config/api';
import { devConfig } from '@/src/config/dev';
import { checkForUpdates } from '@/src/utils/ota-updates';
import { fetchUserStage } from '../user/useUserStage';
import { tokenStorage } from '@/src/services/auth/tokenStorage';
import {
  fetchAndStoreUserPersonalDetails,
  saveUserAppInfoForCurrentSession,
} from '../user/userService';
import { appConfig } from '@/src/config/appConfig';
import { checkAndPromptForMinMajorVersion } from './app-initialization-helper';
import {
  loadDevToggleStateFromStorage,
  resetNgrokApiBaseUrlOnLogout,
} from '@/src/services/devToggles/devTogglesService';
import { useAppConfigStore } from '@/src/store/useAppConfigStore';
import type { EncryptionStatusResponse } from '@/src/types/app-config';
import { getOrCreateDeviceId } from '@/src/utils/deviceId-helper';
import { getCachedGeoLocationString } from '../location/geoLocation';
import { fetchAndStoreAppConfig } from '@/src/hooks/useExternalAppConfig';
import { ensurePlayInstallReferrer } from '@/src/services/installReferrer';
import { logNonFatalError } from '@/src/utils/nonFatalError';

export interface StartupTask {
  name: string;
  execute: () => Promise<void>;
  enabled?: boolean;
}

const initializeDevToggles = async (): Promise<void> => {
  await loadDevToggleStateFromStorage();

  // Logged-out sessions should always use the default API URL.
  const accessToken = await tokenStorage.getAccessToken();
  if (!accessToken) {
    await resetNgrokApiBaseUrlOnLogout();
  }
};

/**
 * Fetches encryption status from public API GET /external/encryption-status (no auth).
 * Stores result so getEnableEncryption() reflects backend setting.
 */
export const fetchAndStoreEncryptionStatus = async (): Promise<void> => {
  if (apiConfig.apiDisabled) return;
  try {
    const url = `${apiConfig.baseUrl}${API_ENDPOINTS.external.encryptionStatus}`;
    const [deviceId, geoLocationStr] = await Promise.all([
      getOrCreateDeviceId(),
      getCachedGeoLocationString(),
    ]);
    const headers: Record<string, string> = {
      'X-Device-Id': deviceId,
      'X-Geo-Location': geoLocationStr,
      ...apiHeaders.getCommon(),
    };
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return;
    const data = (await res.json()) as EncryptionStatusResponse;
    if (data?.success && typeof data.enableEncryption === 'boolean') {
      useAppConfigStore.getState().setEncryptionEnabled(data.enableEncryption);
      if (devConfig.enableDebugLogs) {
        console.log('[Startup] Encryption status:', data.enableEncryption);
      }
    }
  } catch {
    // Leave encryptionEnabled null; getEnableEncryption() stays false.
  }
};

const startupTasks: StartupTask[] = [
  {
    name: 'Play Install Referrer (Android)',
    execute: ensurePlayInstallReferrer,
    enabled: true,
  },
  {
    name: 'Initialize Dev Toggles',
    execute: initializeDevToggles,
    enabled: true,
  },
  {
    name: 'Fetch App Config',
    execute: fetchAndStoreAppConfig,
    enabled: true,
  },
  {
    name: 'Fetch Encryption Status',
    execute: fetchAndStoreEncryptionStatus,
    enabled: true,
  },
  {
    name: 'App Update Check',
    execute: async () => {
      if (!appConfig.enableStartupApis) {
        return;
      }

      const result = await checkAndPromptForMinMajorVersion();

      if (devConfig.enableDebugLogs && result) {
        console.log('[Startup] App update check result', {
          result
        });
      }
    },
    enabled: true,
  },
  {
    name: 'OTA Updates',
    execute: checkForUpdates,
    enabled: true,
  },
  {
    name: 'Get User Stage',
    execute: async () => {
      // Only fetch user stage if user is authenticated
      const accessToken = await tokenStorage.getAccessToken();
      if (!accessToken) {
        if (devConfig.enableDebugLogs) {
          console.log('[Startup] Skipping user stage fetch - user not authenticated');
        }
        return;
      }
      const result = await fetchUserStage();
      if (result?.stage && devConfig.enableDebugLogs) {
        console.log(`[Startup] User stage fetched: ${result.stage}`);
      }
    },
    enabled: true,
  },
  {
    name: 'Fetch User Personal Details',
    execute: async () => {
      // Only fetch personal details if user is authenticated
      const accessToken = await tokenStorage.getAccessToken();
      if (!accessToken) {
        if (devConfig.enableDebugLogs) {
          console.log('[Startup] Skipping personal details fetch - user not authenticated');
        }
        return;
      }
      const details = await fetchAndStoreUserPersonalDetails();
      if (details && devConfig.enableDebugLogs) {
        console.log('[Startup] User personal details fetched and stored');
      }
    },
    enabled: true,
  },
  {
    name: 'Save User App Info',
    execute: async () => {
      const accessToken = await tokenStorage.getAccessToken();
      if (!accessToken) {
        if (devConfig.enableDebugLogs) {
          console.log('[Startup] Skipping app info save - user not authenticated');
        }
        return;
      }

      const result = await saveUserAppInfoForCurrentSession();
      if (!result.success && devConfig.enableDebugLogs) {
        console.log('[Startup] User app info save failed', result.error);
      }
    },
    enabled: true,
  },
  // Add more startup tasks here as needed
];

export async function runStartupTasks(): Promise<void> {
  for (const task of startupTasks) {
    if (task.enabled !== false) {
      try {
        await task.execute();
      } catch (error) {
        logNonFatalError(`startup.${task.name}`, error);
      }
    }
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from '@/src/config/appConfig';
import { apiConfig } from '@/src/config/api';
import { devConfig } from '@/src/config/dev';
import { STORAGE_KEYS } from '@/src/constants/data';
import {
  getCurrentApiBaseUrl,
  isStagingApiOverride,
  setStagingApiOverride,
  syncApiBaseUrl,
  STAGING_API_OVERRIDE,
  type StagingApiOverride,
} from './apiBaseUrlResolver';

export interface DevToggleState {
  useNgrokApiBaseUrl: boolean;
  useAmanNgrokApiBaseUrl: boolean;
  stagingApiOverride: StagingApiOverride;
  useBankStatementUploader: boolean;
}

const logToggleError = (message: string, error: unknown): void => {
  if (!devConfig.enableDebugLogs) {
    return;
  }
  console.log(message, error);
};

const toggleListeners = new Set<() => void>();

export const subscribeToDevToggles = (listener: () => void): (() => void) => {
  toggleListeners.add(listener);
  return () => { toggleListeners.delete(listener); };
};

export const getDevToggleState = (): DevToggleState => ({
  useNgrokApiBaseUrl: appConfig.useNgrokApiBaseUrl,
  useAmanNgrokApiBaseUrl: appConfig.useAmanNgrokApiBaseUrl,
  stagingApiOverride:
    (appConfig as { stagingApiOverride: StagingApiOverride }).stagingApiOverride,
  useBankStatementUploader: appConfig.useBankStatementUploader,
});

export const applyDevToggleState = (
  updates: Partial<DevToggleState>,
): DevToggleState => {
  let shouldRebuildApiBaseUrl = false;

  if (typeof updates.useNgrokApiBaseUrl === 'boolean') {
    appConfig.useNgrokApiBaseUrl = updates.useNgrokApiBaseUrl;
    shouldRebuildApiBaseUrl = true;
  }

  if (typeof updates.useAmanNgrokApiBaseUrl === 'boolean') {
    appConfig.useAmanNgrokApiBaseUrl = updates.useAmanNgrokApiBaseUrl;
    shouldRebuildApiBaseUrl = true;
  }

  if (updates.stagingApiOverride && isStagingApiOverride(updates.stagingApiOverride)) {
    setStagingApiOverride(updates.stagingApiOverride);
    shouldRebuildApiBaseUrl = true;
  }

  if (typeof updates.useBankStatementUploader === 'boolean') {
    appConfig.useBankStatementUploader = updates.useBankStatementUploader;
  }

  if (shouldRebuildApiBaseUrl) {
    apiConfig.baseUrl = syncApiBaseUrl();
  }

  toggleListeners.forEach((listener) => listener());
  return getDevToggleState();
};

apiConfig.baseUrl = getCurrentApiBaseUrl();

export const loadDevToggleStateFromStorage = async (): Promise<DevToggleState> => {
  try {
    const [storedNgrok, storedAmanNgrok, storedStagingApiOverride, storedBankUploader] =
      await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.useNgrokApiBaseUrl),
      AsyncStorage.getItem(STORAGE_KEYS.useAmanNgrokApiBaseUrl),
      AsyncStorage.getItem(STORAGE_KEYS.stagingApiOverride),
      AsyncStorage.getItem(STORAGE_KEYS.useBankStatementUploader),
    ]);

    const updates: Partial<DevToggleState> = {};

    if (storedNgrok != null) {
      updates.useNgrokApiBaseUrl = storedNgrok === 'true';
    }

    if (storedAmanNgrok != null) {
      updates.useAmanNgrokApiBaseUrl = storedAmanNgrok === 'true';
    }

    if (storedStagingApiOverride != null && isStagingApiOverride(storedStagingApiOverride)) {
      updates.stagingApiOverride = storedStagingApiOverride;
    }

    if (storedBankUploader != null) {
      updates.useBankStatementUploader = storedBankUploader === 'true';
    }

    return applyDevToggleState(updates);
  } catch (error) {
    logToggleError('[DevToggles] Failed to load toggles from storage', error);
    return getDevToggleState();
  }
};

export const setUseNgrokApiBaseUrlToggle = async (value: boolean): Promise<void> => {
  applyDevToggleState({ useNgrokApiBaseUrl: value });
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.useNgrokApiBaseUrl,
      value ? 'true' : 'false',
    );
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist ngrok toggle', error);
  }
};

export const setUseAmanNgrokApiBaseUrlToggle = async (value: boolean): Promise<void> => {
  applyDevToggleState({ useAmanNgrokApiBaseUrl: value });
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.useAmanNgrokApiBaseUrl,
      value ? 'true' : 'false',
    );
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist Aman ngrok toggle', error);
  }
};

export const setUseBankStatementUploaderToggle = async (
  value: boolean,
): Promise<void> => {
  applyDevToggleState({ useBankStatementUploader: value });
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.useBankStatementUploader,
      value ? 'true' : 'false',
    );
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist bank uploader toggle', error);
  }
};

export const setStagingApiOverrideToggle = async (
  value: StagingApiOverride,
): Promise<void> => {
  applyDevToggleState({ stagingApiOverride: value });
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.stagingApiOverride, value);
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist staging API override', error);
  }
};

export const resetNgrokApiBaseUrlOnLogout = async (): Promise<void> => {
  applyDevToggleState({
    useNgrokApiBaseUrl: false,
    useAmanNgrokApiBaseUrl: false,
    stagingApiOverride: STAGING_API_OVERRIDE.none,
  });
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.useNgrokApiBaseUrl),
      AsyncStorage.removeItem(STORAGE_KEYS.useAmanNgrokApiBaseUrl),
      AsyncStorage.removeItem(STORAGE_KEYS.stagingApiOverride),
    ]);
  } catch (error) {
    logToggleError('[DevToggles] Failed to clear API URL toggles during logout', error);
  }
};

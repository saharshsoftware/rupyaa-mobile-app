import { appConfig } from '@/src/config/appConfig';
import { apiConfig } from '@/src/config/api';
import { devConfig } from '@/src/config/dev';
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
  useAdityaNgrokApiBaseUrl: boolean;
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
  useAdityaNgrokApiBaseUrl: appConfig.useAdityaNgrokApiBaseUrl,
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

  if (typeof updates.useAdityaNgrokApiBaseUrl === 'boolean') {
    appConfig.useAdityaNgrokApiBaseUrl = updates.useAdityaNgrokApiBaseUrl;
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
    const { storageService } = await import('@/src/services/storage/storageService');
    const [storedNgrok, storedAmanNgrok, storedAdityaNgrok, storedStagingApiOverride, storedBankUploader] =
      await Promise.all([
      storageService.getKey('useNgrokApiBaseUrl'),
      storageService.getKey('useAmanNgrokApiBaseUrl'),
      storageService.getKey('useAdityaNgrokApiBaseUrl'),
      storageService.getKey('stagingApiOverride'),
      storageService.getKey('useBankStatementUploader'),
    ]);

    const updates: Partial<DevToggleState> = {};

    if (storedNgrok != null) {
      updates.useNgrokApiBaseUrl = storedNgrok === 'true';
    }

    if (storedAmanNgrok != null) {
      updates.useAmanNgrokApiBaseUrl = storedAmanNgrok === 'true';
    }

    if (storedAdityaNgrok != null) {
      updates.useAdityaNgrokApiBaseUrl = storedAdityaNgrok === 'true';
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
    const { storageService } = await import('@/src/services/storage/storageService');
    await storageService.setKey('useNgrokApiBaseUrl',
      value ? 'true' : 'false',
    );
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist ngrok toggle', error);
  }
};

export const setUseAmanNgrokApiBaseUrlToggle = async (value: boolean): Promise<void> => {
  applyDevToggleState({ useAmanNgrokApiBaseUrl: value });
  try {
    const { storageService } = await import('@/src/services/storage/storageService');
    await storageService.setKey('useAmanNgrokApiBaseUrl',
      value ? 'true' : 'false',
    );
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist Aman ngrok toggle', error);
  }
};

export const setUseAdityaNgrokApiBaseUrlToggle = async (value: boolean): Promise<void> => {
  applyDevToggleState({ useAdityaNgrokApiBaseUrl: value });
  try {
    const { storageService } = await import('@/src/services/storage/storageService');
    await storageService.setKey('useAdityaNgrokApiBaseUrl',
      value ? 'true' : 'false',
    );
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist Aditya ngrok toggle', error);
  }
};

export const setUseBankStatementUploaderToggle = async (
  value: boolean,
): Promise<void> => {
  applyDevToggleState({ useBankStatementUploader: value });
  try {
    const { storageService } = await import('@/src/services/storage/storageService');
    await storageService.setKey('useBankStatementUploader',
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
    const { storageService } = await import('@/src/services/storage/storageService');
    await storageService.setKey('stagingApiOverride', value);
  } catch (error) {
    logToggleError('[DevToggles] Failed to persist staging API override', error);
  }
};

export const resetNgrokApiBaseUrlOnLogout = async (): Promise<void> => {
  applyDevToggleState({
    useNgrokApiBaseUrl: false,
    useAmanNgrokApiBaseUrl: false,
    useAdityaNgrokApiBaseUrl: false,
    stagingApiOverride: STAGING_API_OVERRIDE.none,
  });
  try {
    const { storageService } = await import('@/src/services/storage/storageService');
    await Promise.all([
      storageService.clearKey('useNgrokApiBaseUrl'),
      storageService.clearKey('useAmanNgrokApiBaseUrl'),
      storageService.clearKey('useAdityaNgrokApiBaseUrl'),
      storageService.clearKey('stagingApiOverride'),
    ]);
  } catch (error) {
    logToggleError('[DevToggles] Failed to clear API URL toggles during logout', error);
  }
};

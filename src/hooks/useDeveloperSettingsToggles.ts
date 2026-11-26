import { useEffect, useSyncExternalStore } from 'react';
import {
  getDevToggleState,
  subscribeToDevToggles,
  loadDevToggleStateFromStorage,
  setStagingApiOverrideToggle,
  setUseAmanNgrokApiBaseUrlToggle,
  setUseAdityaNgrokApiBaseUrlToggle,
  setUseBankStatementUploaderToggle,
  setUseNgrokApiBaseUrlToggle,
} from '@/src/services/devToggles/devTogglesService';
import { STAGING_API_OVERRIDE } from '@/src/services/devToggles/apiBaseUrlResolver';

export const useDeveloperSettingsToggles = () => {
  const useNgrokApiBaseUrl = useSyncExternalStore(
    subscribeToDevToggles, () => getDevToggleState().useNgrokApiBaseUrl,
  );
  const useAmanNgrokApiBaseUrl = useSyncExternalStore(
    subscribeToDevToggles, () => getDevToggleState().useAmanNgrokApiBaseUrl,
  );
  const useAdityaNgrokApiBaseUrl = useSyncExternalStore(
    subscribeToDevToggles, () => getDevToggleState().useAdityaNgrokApiBaseUrl,
  );
  const useBankStatementUploader = useSyncExternalStore(
    subscribeToDevToggles, () => getDevToggleState().useBankStatementUploader,
  );
  const stagingApiOverride = useSyncExternalStore(
    subscribeToDevToggles, () => getDevToggleState().stagingApiOverride,
  );

  useEffect(() => {
    void loadDevToggleStateFromStorage();
  }, []);

  const clearStagingOverride = () => {
    void setStagingApiOverrideToggle(STAGING_API_OVERRIDE.none);
  };

  const clearNgrokToggles = () => {

    void setUseNgrokApiBaseUrlToggle(false);
    void setUseAmanNgrokApiBaseUrlToggle(false);
    void setUseAdityaNgrokApiBaseUrlToggle(false);
  };

  const handleToggleNgrokBaseUrl = (value: boolean) => {
    // Only one API base URL source can stay active at a time.
    if (value) {
      void setUseAmanNgrokApiBaseUrlToggle(false);
      void setUseAdityaNgrokApiBaseUrlToggle(false);
      clearStagingOverride();
    }

    void setUseNgrokApiBaseUrlToggle(value);
  };

  const handleToggleAmanNgrokBaseUrl = (value: boolean) => {
    if (value) {
      void setUseAdityaNgrokApiBaseUrlToggle(false);
      void setUseNgrokApiBaseUrlToggle(false);
      clearStagingOverride();
    }

    void setUseAmanNgrokApiBaseUrlToggle(value);
  };

  const handleToggleAdityaNgrokBaseUrl = (value: boolean) => {
    if (value) {
      void setUseNgrokApiBaseUrlToggle(false);
      void setUseAmanNgrokApiBaseUrlToggle(false);
      clearStagingOverride();
    }

    void setUseAdityaNgrokApiBaseUrlToggle(value);
  };

  const handleToggleBankStatementUploader = (value: boolean) => {
    void setUseBankStatementUploaderToggle(value);
  };

  const handleToggleStaging2ApiBaseUrl = (value: boolean) => {
    const nextValue = value ? STAGING_API_OVERRIDE.staging2 : STAGING_API_OVERRIDE.none;
    if (value) {
      clearNgrokToggles();
    }

    void setStagingApiOverrideToggle(nextValue);
  };

  const handleToggleStagingApiV1BaseUrl = (value: boolean) => {
    const nextValue = value ? STAGING_API_OVERRIDE.staging : STAGING_API_OVERRIDE.none;
    if (value) {
      clearNgrokToggles();
    }

    void setStagingApiOverrideToggle(nextValue);
  };

  return {
    useNgrokApiBaseUrl,
    useAmanNgrokApiBaseUrl,
    useAdityaNgrokApiBaseUrl,
    useBankStatementUploader,
    stagingApiOverride,
    handleToggleNgrokBaseUrl,
    handleToggleAmanNgrokBaseUrl,
    handleToggleAdityaNgrokBaseUrl,
    handleToggleBankStatementUploader,
    handleToggleStaging2ApiBaseUrl,
    handleToggleStagingApiV1BaseUrl,
  };
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/src/constants/data';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useFlowStore } from '@/src/store/useFlowStore';
import { offerService } from '@/src/services/offer';
import { trackClarityLogoutFromAppState } from '@/src/services/analytics/clarityUserSession';
import { resetNgrokApiBaseUrlOnLogout } from '@/src/services/devToggles/devTogglesService';

export const storageService = {
  getAllKeys: () => Object.values(STORAGE_KEYS),

  getKey: async (key: keyof typeof STORAGE_KEYS) => AsyncStorage.getItem(STORAGE_KEYS[key]),

  setKey: async (key: keyof typeof STORAGE_KEYS, value: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS[key], value);
  },

  clearAllAppStorage: async () => {
    const CLEAR_KEYS = [
      STORAGE_KEYS.registrationStep,
      STORAGE_KEYS.registrationData,
    ];
    await AsyncStorage.multiRemove(CLEAR_KEYS);
    await resetNgrokApiBaseUrlOnLogout();
    await trackClarityLogoutFromAppState(useFlowStore.getState().userStage ?? null);
    await useAuthStore.getState().clearSession();
    // Reset timeline state (persisted under separate key)
    useFlowStore.getState().reset();
    // Reset offer state
    await offerService.reset();
  },

  clearKey: async (key: keyof typeof STORAGE_KEYS) => {
    await AsyncStorage.removeItem(STORAGE_KEYS[key]);
  },
};

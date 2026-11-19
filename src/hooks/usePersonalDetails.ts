import { useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { selectIsAuthenticated, useAuthStore } from '@/src/store/useAuthStore';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';
import { fetchAndStoreUserPersonalDetails } from '@/src/services/user/userService';

export function usePersonalDetails(refreshOnFocus = false) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const personalDetails = useUserDetailsStore((s) => s.personalDetails);
  const isFetching = useUserDetailsStore((s) => s.isLoading);

  useEffect(() => {
    if (isAuthenticated && !personalDetails) {
      void fetchAndStoreUserPersonalDetails();
    }
  }, [isAuthenticated, personalDetails]);

  useFocusEffect(useCallback(() => {
    if (refreshOnFocus && isAuthenticated) {
      void fetchAndStoreUserPersonalDetails({ forceRefresh: true });
    }
  }, [isAuthenticated, refreshOnFocus]));

  return { personalDetails, isFetching };
}

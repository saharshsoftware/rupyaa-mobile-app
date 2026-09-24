import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  markBootstrapComplete,
  resolveInitialNavigation,
} from '@/src/services/navigation';
import { useAuthStore } from '@/src/store/useAuthStore';
import { colors } from '@/src/theme';
import { appConfig } from '@/src/config/appConfig';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        // Hydrate auth before routing so tab guards and routeResolver see the same session state.
        await useAuthStore.getState().hydrate();
        const route = await resolveInitialNavigation();
        if (isActive) {
          router.replace(route as Parameters<typeof router.replace>[0]);
        }
      } catch {
        if (isActive) {
          router.replace(
            appConfig.enableOnboarding
              ? '/onboarding'
              : '/auth/mobile-verification'
          );
        }
      } finally {
        // Release the bootstrap latch unconditionally so child layouts
        // (e.g. (tabs)/_layout) can run their auth guards. Runs on success,
        // error, and unmount paths to prevent deadlocks.
        markBootstrapComplete();
      }
    })();

    return () => {
      isActive = false;
    };
  }, [router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
});

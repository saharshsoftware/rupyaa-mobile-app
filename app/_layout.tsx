import { setupGlobalErrorHandlers } from '@/src/utils/setupGlobalErrorHandlers';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import * as SplashScreen from 'expo-splash-screen';
import '@/src/services/i18n';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStartup } from '@/hooks/useAppStartup';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useNavigationService } from '@/hooks/useNavigationService';
import { QueryProvider } from '@/src/services/query/QueryProvider';
import { useCredeauSync } from '@/src/hooks/useCredeauSync';
import { useLogPool } from '@/hooks/useLogPool';
import { useDeepLinkHandler } from '@/src/hooks/useDeepLinkHandler';
import { colors } from '@/src/theme';
import { startNetworkLogging, stopNetworkLogging } from 'react-native-network-logger';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { appConfig } from '@/src/config/appConfig';
import { isTestOrReviewPhoneNumber } from '@/src/config/resolvedAppConfig';
import { useAppConfigStore } from '@/src/store/useAppConfigStore';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';
import { UpdateModal } from '@/src/components/UpdateModal';
import { DeviceSecurityOverlay } from '@/src/components/DeviceSecurityOverlay';
import {
  ScreenBackground,
  SecurityErrorScreen,
} from '@/src/components';
import {
  freeRaspActions,
  freeRaspConfig,
  freeRaspConfigValid,
  freeRaspExecutionStateActions,
  useFreeRaspSafe,
} from '@/src/services/security';
import {
  cleanupSslPinningListener,
  setupSslPinning,
} from '@/src/security/sslPinning';

SplashScreen.preventAutoHideAsync();

const transparentNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.transparent,
    card: colors.transparent,
  },
};

function FreeRaspInitializer() {
  useFreeRaspSafe(freeRaspConfig, freeRaspActions, freeRaspExecutionStateActions);
  return null;
}

const basePlatformAndDevGate =
  Platform.OS !== 'web' &&
  (
    !__DEV__ ||
    // Dev opt-in only: Fast Refresh can trigger duplicate native init, so use this for temporary local testing.
    appConfig.enableFreeRaspInDev
  );

function AppBootstrap({ shouldEnableFreeRasp }: { shouldEnableFreeRasp: boolean }) {
  const { t } = useTranslation();
  useFrameworkReady();
  useAppStartup();
  useNavigationService();
  usePushNotifications();
  useDeepLinkHandler();

  // TODO: Uncomment this after verifying review build
  useCredeauSync();
  useLogPool();

  return (
    <>
      {shouldEnableFreeRasp ? <FreeRaspInitializer /> : null}
      <SafeAreaProvider>
        <QueryProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <UpdateModal />
            <DeviceSecurityOverlay />
            <ThemeProvider value={transparentNavigationTheme}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
                  presentation: 'card',
                  gestureEnabled: true,
                  contentStyle: { backgroundColor: colors.transparent },
                  headerStyle: { backgroundColor: colors.transparent },
                  // iOS: "minimal" = chevron only (no "Back" / previous title). Tint defaults to blue without headerTintColor.
                  headerBackButtonDisplayMode: 'minimal',
                  headerTintColor: colors.text.primary,
                  headerShadowVisible: false,
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="onboarding-language" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="permissions" />
                <Stack.Screen name="loan-journey" />
                <Stack.Screen name="dev-panel" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="privacy" options={{ headerShown: true, title: t('Privacy Policy') }} />
                <Stack.Screen name="terms" options={{ headerShown: true, title: t('Terms & Conditions') }} />
                <Stack.Screen name="products" />
                <Stack.Screen name="support" options={{ headerShown: true, title: t('Support') }} />
                <Stack.Screen name="faq" options={{ headerShown: true, title: t('FAQs') }} />
                <Stack.Screen name="my-profile" options={{ headerShown: true, title: t('My Profile') }} />
                <Stack.Screen name="language-selection" options={{ headerShown: true, title: t('Language') }} />
                <Stack.Screen name="lending-partners" options={{ headerShown: true, title: t('Lending Partners') }} />
                <Stack.Screen name="grievance-redressal-mechanism" options={{ headerShown: true, title: t('Grievance Redressal Mechanism') }} />
                <Stack.Screen name="grievance-redressal-policy" options={{ headerShown: true, title: t('Grievance Redressal Policy') }} />
                <Stack.Screen name="user-permissions" options={{ headerShown: true, title: t('Permissions') }} />
                <Stack.Screen name="contacts" options={{ headerShown: true, title: t('Contacts') }} />
                <Stack.Screen name="credit-score" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
            </ThemeProvider>
            <StatusBar style="dark" translucent backgroundColor="transparent" />
          </GestureHandlerRootView>
        </QueryProvider>
      </SafeAreaProvider>
    </>
  );
}

export default function RootLayout() {
  const [securityReady, setSecurityReady] = useState(false);
  const [securityFailed, setSecurityFailed] = useState(false);
  const [securityErrorMessage, setSecurityErrorMessage] = useState(
    'Secure connection could not be verified. Please try again.',
  );
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
  });

  // Subscribed so RootLayout re-renders once app-config / personal details load, re-evaluating
  // freeRASP eligibility for Play Store review / internal test phone numbers.
  useAppConfigStore((state) => state.config);
  useUserDetailsStore((state) => state.personalDetails);
  const shouldEnableFreeRasp =
    basePlatformAndDevGate && !isTestOrReviewPhoneNumber() && freeRaspConfigValid;

  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }
    if (!securityReady && !securityFailed) {
      return;
    }
    void SplashScreen.hideAsync();
  }, [fontsLoaded, securityReady, securityFailed]);

  useEffect(() => {
    let cancelled = false;

    const handleSslPinMismatch = (hostname: string): void => {
      console.log('[SSL Pinning] Blocking app after pin mismatch', { hostname });
      if (!cancelled) {
        setSecurityErrorMessage(
          'We blocked this connection because the network could not be verified. Please turn off VPN/proxy tools and try again.',
        );
        setSecurityFailed(true);
      }
    };

    const initializeSecurity = async () => {
      try {
        await setupSslPinning(handleSslPinMismatch);
        if (!cancelled) {
          setSecurityReady(true);
        }
      } catch (error) {
        console.log('[SSL Pinning] Initialization failed', error);
        if (!cancelled) {
          setSecurityErrorMessage('Secure connection could not be verified. Please try again.');
          setSecurityFailed(true);
        }
      }
    };

    void initializeSecurity();

    return () => {
      cancelled = true;
      cleanupSslPinningListener();
    };
  }, []);

  useEffect(() => {
    if (!__DEV__ || Platform.OS === 'web') {
      return;
    }

    startNetworkLogging({
      ignoredPatterns: [/^OPTIONS /],
    });

    return () => {
      stopNetworkLogging();
    };
  }, []);

  if (!fontsLoaded || (!securityReady && !securityFailed)) {
    return null;
  }
  if (securityFailed) {
    return <SecurityErrorScreen message={securityErrorMessage} />;
  }
  return (
    <ScreenBackground>
      <AppBootstrap shouldEnableFreeRasp={shouldEnableFreeRasp} />
    </ScreenBackground>
  );
}

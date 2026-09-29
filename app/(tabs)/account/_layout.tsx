import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/src/theme';

export default function AccountTabStackLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) {
          return false;
        }
        router.replace('/(tabs)/account');
        return true;
      });

      return () => subscription.remove();
    }, [router]),
  );

  return (
    <Stack
      screenOptions={{
        animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
        presentation: 'card',
        gestureEnabled: true,
        contentStyle: {
          backgroundColor: colors.transparent,
        },
        headerStyle: {
          backgroundColor: colors.transparent,
        },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('Account'),
          headerShown: true,
        }}
      />
      {/* <Stack.Screen name="my-profile" options={{ title: 'My Profile' }} /> */}
      <Stack.Screen name="contacts" options={{ title: t('Refer') }} />
      <Stack.Screen name="loan-agreement" options={{ title: t('Loan Agreement') }} />
      <Stack.Screen name="lending-partners" options={{ title: t('Trusted Lending Partners') }} />
      <Stack.Screen name="permissions" options={{ title: t('Permissions') }} />
      <Stack.Screen name="network-logger" options={{ headerShown: true, title: t('Network Logger') }} />

    </Stack>
  );
}

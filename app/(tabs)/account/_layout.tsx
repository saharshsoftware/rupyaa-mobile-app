import { useCallback } from 'react';
import { BackHandler, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import { AppText } from '@/src/components';
import { colors, spacing } from '@/src/theme';

export default function AccountTabStackLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleAccountBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/home');
  }, [router]);

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
          headerTitle: () => null,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleAccountBack}
              style={styles.headerLeft}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color={colors.text.primary} strokeWidth={2} />
              <AppText variant="h4" weight="semiBold" color="textprimary">
                {t('Account')}
              </AppText>
            </TouchableOpacity>
          ),
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

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
});

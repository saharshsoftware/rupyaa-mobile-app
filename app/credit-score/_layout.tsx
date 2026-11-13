import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/src/theme';

export default function CreditScoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
        presentation: 'card',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="detailed-report" />
    </Stack>
  );
}

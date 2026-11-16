import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircleAlert } from 'lucide-react-native';
import { AppText, Button } from '@/src/components';
import { colors, spacing } from '@/src/theme';

interface Props {
  onRetry: () => void;
  loading: boolean;
}

export function CreditScoreUnavailable({ onRetry, loading }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.container}>
        <CircleAlert size={64} color={colors.primary.main} />
        <AppText variant="h3" weight="bold" color="primary" align="center" style={styles.title}>
          Credit score unavailable
        </AppText>
        <AppText color="black" align="center">
          {"We couldn't generate your Equifax report right now. Please try again."}
        </AppText>
        <Button fullWidth size="large" loading={loading} onPress={onRetry} style={styles.button}>
          Retry
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: { marginTop: spacing.lg, marginBottom: spacing.sm },
  button: { marginTop: spacing.xl },
});

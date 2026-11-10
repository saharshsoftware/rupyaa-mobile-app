import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CircleAlert } from 'lucide-react-native';
import { AppText, Button, RupyaaLogo } from '@/src/components';
import { colors, spacing } from '@/src/theme';

interface Props {
  onRetry: () => void;
  onBack: () => void;
  loading: boolean;
}

export function CreditScoreUnavailable({ onRetry, onBack, loading }: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <RupyaaLogo size="sm" style={styles.logo} />
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>
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
  logo: {
    marginTop: spacing['4xl'],
    marginLeft: spacing.md + spacing.base,
    marginBottom: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginLeft: spacing.sm + spacing.base,
    marginBottom: spacing.md,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: { marginTop: spacing.lg, marginBottom: spacing.sm },
  button: { marginTop: spacing.xl },
});

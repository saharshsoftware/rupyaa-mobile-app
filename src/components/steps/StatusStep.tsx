import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import type { StepProps } from '@/src/types/flow';
import { colors, spacing } from '@/src/theme';

export function StatusStep({ onNext, onPrev }: StepProps) {
  return (
    <FormLayout
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={
        <Button variant="primary" size="large" fullWidth onPress={onNext}>
          Continue
        </Button>
      }
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={64} color={colors.success.main} />
        </View>
        <AppText style={styles.title} variant="h3" weight="bold">
          Bank Connection Status
        </AppText>
        <AppText style={styles.subtitle} variant="body">
          Your bank has been successfully connected. We&apos;re processing your application.
        </AppText>
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <AppText style={styles.statusLabel} variant="body" weight="medium">
              Status:
            </AppText>
            <AppText style={styles.statusValue} variant="body" weight="medium">
              Connected
            </AppText>
          </View>
        </View>
      </View>
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.base,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  statusContainer: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.base,
    marginTop: spacing.base,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: colors.text.secondary,
  },
  statusValue: {
    color: colors.success.main,
  },
});

/**
 * Dev-only: Floating toolbar to test Active Loan card variations (Active vs Overdue).
 * Renders only when __DEV__ and showWhenActive is true (user in ACTIVE_LOAN_DASHBOARD).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AppText } from '../AppText';
import { colors, spacing, radius } from '@/src/theme';
import { useActiveLoanDevStore, type ActiveLoanTestVariant } from '@/src/store/useActiveLoanDevStore';

export interface ActiveLoanDevToolbarProps {
  /** Only render when user is in ACTIVE_LOAN_DASHBOARD */
  visible: boolean;
}

export function ActiveLoanDevToolbar({ visible }: ActiveLoanDevToolbarProps) {
  return visible && __DEV__ ? <ActiveLoanDevToolbarContent /> : null;
}

function ActiveLoanDevToolbarContent() {

  const testVariant = useActiveLoanDevStore((s) => s.testVariant);
  const setTestVariant = useActiveLoanDevStore((s) => s.setTestVariant);

  const renderButton = (variant: ActiveLoanTestVariant, label: string) => {
    const isSelected = testVariant === variant;
    return (
      <TouchableOpacity
        key={variant ?? 'real'}
        style={[styles.button, isSelected && styles.buttonSelected]}
        onPress={() => setTestVariant(testVariant === variant ? null : variant)}
        accessibilityRole="button"
        accessibilityLabel={`Test ${label}`}
      >
        <AppText
          variant="captionSmall"
          weight="semiBold"
          style={[styles.buttonText, isSelected && styles.buttonTextSelected]}
        >
          {label}
        </AppText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppText variant="captionSmall" style={styles.label}>
        Test:
      </AppText>
      {renderButton('active', 'Active')}
      {renderButton('overdue', 'Overdue')}
      {renderButton(null, 'Real')}
      {testVariant && (
        <AppText variant="captionSmall" style={styles.hint}>
          ({testVariant})
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.warning.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning.main,
  },
  label: {
    color: colors.warning.dark,
    marginRight: spacing.xs,
  },
  button: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.background.primary,
  },
  buttonSelected: {
    backgroundColor: colors.warning.main,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 10,
  },
  buttonTextSelected: {
    color: colors.text.inverse,
  },
  hint: {
    color: colors.warning.dark,
    marginLeft: 'auto',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button } from '@/src/components';
import { spacing } from '@/src/theme';
import type { GetExistingActiveLoanResponse } from '@/src/types/loans';
import { getActiveLoanRepaymentEmptyMessage } from '@/src/utils/loan-helpers';
import { navigateToMyLoanTab } from '@/src/services/navigation';

export interface ActiveLoanRepaymentEmptyStateProps {
  activeLoanData: GetExistingActiveLoanResponse | null | undefined;
}

export function ActiveLoanRepaymentEmptyState({
  activeLoanData,
}: ActiveLoanRepaymentEmptyStateProps) {
  const { t } = useTranslation();
  const message = getActiveLoanRepaymentEmptyMessage(activeLoanData);

  return (
    <View style={styles.centered}>
      <AppText variant="body" style={styles.message}>
        {t(message)}
      </AppText>
      <Button
        title={t('View my loans')}
        onPress={navigateToMyLoanTab}
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    maxWidth: 320,
  },
});
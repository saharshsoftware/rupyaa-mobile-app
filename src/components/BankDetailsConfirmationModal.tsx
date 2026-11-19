import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, radius, spacing } from '@/src/theme';
import type { BankAccountType } from '@/src/types/kyc';

interface BankDetailsConfirmationModalProps {
  visible: boolean;
  accountHolderName: string;
  accountNumber: string;
  accountType: BankAccountType;
  bankName: string;
  ifscCode: string;
  onEdit: () => void;
  onConfirm: () => void;
}

interface DetailRowProps {
  label: string;
  value: string;
}

const DETAIL_ROWS: readonly (keyof Pick<
  BankDetailsConfirmationModalProps,
  'accountHolderName' | 'accountNumber' | 'accountType' | 'bankName' | 'ifscCode'
>)[] = ['accountHolderName', 'accountNumber', 'accountType', 'bankName', 'ifscCode'];

const DETAIL_LABELS: Record<(typeof DETAIL_ROWS)[number], string> = {
  accountHolderName: 'Account Holder Name',
  accountNumber: 'Bank Account Number',
  accountType: 'Bank Account Type',
  bankName: 'Bank Name',
  ifscCode: 'IFSC Code',
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" weight="semiBold" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="caption" weight="medium" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

export function BankDetailsConfirmationModal({
  visible,
  onEdit,
  onConfirm,
  ...details
}: BankDetailsConfirmationModalProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, spacing.base);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onEdit}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onEdit}>
        <TouchableOpacity
          style={[styles.sheet, { paddingBottom: bottomPadding }]}
          activeOpacity={1}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.dragHandle} />
          <AppText variant="h4" weight="semiBold" style={styles.title}>
            Please re-confirm your bank details
          </AppText>

          <View style={styles.details}>
            {DETAIL_ROWS.map((key) => (
              <DetailRow key={key} label={DETAIL_LABELS[key]} value={details[key]} />
            ))}
          </View>

          <View style={styles.actions}>
            <Button variant="outline" size="small" style={styles.action} onPress={onEdit}>
              Edit details
            </Button>
            <Button variant="primary" size="small" style={styles.action} onPress={onConfirm}>
              Yes, proceed
            </Button>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 128,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.text.primary,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: 20,
    lineHeight: 30,
    marginBottom: spacing.xl,
  },
  details: {
    gap: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailLabel: {
    flex: 1,
    color: colors.text.gray,
    fontSize: 14,
    lineHeight: 21,
  },
  detailValue: {
    flex: 1,
    color: colors.text.gray,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.base,
    paddingVertical: spacing.lg,
  },
  action: {
    flex: 1,
  },
});

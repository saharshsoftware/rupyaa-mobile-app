import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/src/theme';
import { AppText } from '../AppText';
import { formatCurrency } from '@/src/utils/common-helper';
import { formatLoanDueDate } from '@/src/utils/loan-helpers';
import { Button } from '../Button';
import { CancelLoanEntryLink } from '../loan-cancellation/CancelLoanEntryLink';

export interface ActiveLoanCardProps {
  /** Full loan amount disbursed (e.g. ₹50,000) — kept for context/future use */
  amount: number;
  isPendingPayment?: boolean;
  /**
   * Amount currently due for repayment (Total Payable).
   * Optional — `dueAmount` API field is not yet available; shows ₹0 until live.
   */
  amountDue?: number;
  /** Due date string (ISO or parseable format) */
  dueDate: string;
  /** Controls pill badge and status-specific copy */
  statusPill: 'Active' | 'Overdue';
  /** CTA button label */
  actionLabel: string;
  onActionPress?: () => void;
  disableAction?: boolean;
  /** When true, shows "Not interested in loan?" below Pay Now. */
  showCancelLoanEntry?: boolean;
  /** When true, "Cancel loan" link is tappable (gated by cancel-eligibility API). */
  canCancelLoan?: boolean;
  onCancelLoanPress?: () => void;
}

const STATUS_CONFIG = {
  Processing: {
    message: 'Money transfer initiated to your bank account.',
    description: 'It can take up to 6–8 hours to reflect.',
    pillLabel: 'PROCESSING',
    showDot: true,
  },
  Active: {
    message: 'Your loan is active.',
    description: 'Close on time to avoid late fees and save on interest.',
    pillLabel: 'ACTIVE',
    showDot: true,
  },
  Overdue: {
    message: 'Your loan is overdue.',
    description: 'Pay now to avoid additional late fees and penalties.',
    pillLabel: 'OVERDUE',
    showDot: false,
  },
} as const;

export function ActiveLoanCard({
  amount,
  amountDue,
  isPendingPayment = false,
  dueDate,
  statusPill,
  actionLabel,
  onActionPress,
  disableAction = false,
  showCancelLoanEntry = false,
  canCancelLoan = false,
  onCancelLoanPress,
}: ActiveLoanCardProps) {
  const { t } = useTranslation();
  const isOverdue = statusPill === 'Overdue';
  const isInteractive = typeof onActionPress === 'function' && !disableAction && !isPendingPayment;
  const dueDateFormatted = formatLoanDueDate(dueDate);
  const { message, description, pillLabel, showDot } = STATUS_CONFIG[isPendingPayment ? 'Processing' : statusPill];

  // dueAmount API field not yet live — show 0 until the field is available from API
  const totalPayable = typeof amountDue === 'number' && amountDue > 0 ? amountDue : 0;
  const amountLabel = isPendingPayment ? 'Loan Amount' : 'Total Amount Due';
  const displayAmount = isPendingPayment ? amount : totalPayable;
  const dateLabel = isPendingPayment ? 'Transfer Status' : 'Due Date';
  const dateValue = isPendingPayment ? t('Sent to your bank account') : dueDateFormatted || '--';
  const buttonLabel = isPendingPayment ? t('Transfer in progress') : actionLabel;
  const pillStyle = isOverdue ? styles.statusPillOverdue : styles.statusPillActive;
  const pillTextStyle = isOverdue ? styles.statusPillTextOverdue : styles.statusPillTextActive;
  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <View style={styles.content}>
          <View
            style={[
              styles.statusPill,
              isPendingPayment ? styles.statusPillProcessing : pillStyle,
            ]}
          >
            {showDot ? <View style={[styles.statusDotActive, isPendingPayment && styles.statusDotProcessing]} /> : null}
            <AppText
              variant="captionExtraSmall"
              weight="semiBold"
              style={isPendingPayment ? styles.statusPillTextProcessing : pillTextStyle}
            >
              {t(pillLabel)}
            </AppText>
          </View>

          <AppText variant="h3" weight="bold" style={styles.loanStatusTitle}>
            {t('Loan Status')}
          </AppText>
          <AppText variant="captionExtraSmall" style={styles.statusMessage}>
            {t(message)}
          </AppText>
          <AppText variant="captionExtraSmall" style={styles.description}>
            {t(description)}
          </AppText>

          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <AppText variant="captionExtraSmall" style={styles.infoLabel}>
                {t(amountLabel)}
              </AppText>
              <AppText variant="captionSmall" weight="semiBold" style={[styles.infoValue, isPendingPayment && styles.processingInfoValue]}>
                {formatCurrency(displayAmount)}
              </AppText>
            </View>
            <View style={styles.infoCard}>
              <AppText variant="captionExtraSmall" style={styles.infoLabel}>
                {t(dateLabel)}
              </AppText>
              <AppText variant="captionSmall" weight="semiBold" style={[styles.infoValue, isPendingPayment && styles.processingInfoValue]}>
                {dateValue}
              </AppText>
            </View>
          </View>

          <Button
            variant="primary"
            size="medium"
            fullWidth={true}
            title={buttonLabel}
            onPress={onActionPress}
            disabled={!isInteractive}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
          />

          {showCancelLoanEntry ? (
            <CancelLoanEntryLink
              showLink={canCancelLoan}
              onLinkPress={onCancelLoanPress ?? (() => undefined)}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: {
    width: '100%',
    minHeight: 220,
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.base,
  },
  statusPill: {
    position: 'absolute',
    top: 0,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 82,
    minHeight: 28,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    justifyContent: 'center',
  },
  statusPillProcessing: {
    backgroundColor: colors.warning.bg,
    borderWidth: 1,
    borderColor: colors.warning.dark,
  },
  statusPillTextProcessing: {
    color: colors.warning.dark,
    fontSize: typography.fontSize.xxs,
  },
  statusDotProcessing: {
    backgroundColor: colors.warning.dark,
  },
  processingInfoValue: {
    color: colors.text.primary,
  },
  statusPillActive: {
    backgroundColor: colors.text.black,
  },
  statusPillOverdue: {
    backgroundColor: colors.error.dark,
  },
  statusDotActive: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary.main,
  },
  statusPillTextActive: {
    color: colors.primary.main,
    fontSize: typography.fontSize.xxs,
  },
  statusPillTextOverdue: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.xxs,
  },
  loanStatusTitle: {
    color: colors.text.black,
    textAlign: 'center',
  },
  statusMessage: {
    color: colors.text.black,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  description: {
    color: colors.text.black,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  infoCard: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    color: colors.text.gray,
    textAlign: 'center',
  },
  infoValue: {
    color: colors.primary.main,
    textAlign: 'center',
    marginTop: 2,
  },
  ctaButton: {
    minHeight: 42,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.text.black,
    marginTop: 0,
  },
  ctaButtonText: {
    color: colors.primary.main,
  },
});

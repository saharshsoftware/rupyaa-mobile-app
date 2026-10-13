/**
 * PreOfferCard - Presentational card for pre-offer stages (register phase).
 * Design: green top bar, icon box + Pre-Approved pill, "Instant Loan up to" + amount, description, CTA, footer.
 */

import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator, type ImageSourcePropType } from 'react-native';
import { colors, spacing, radius, typography, shadows } from '@/src/theme';
import { AppText } from '../AppText';
import { formatCurrency } from '@/src/utils/common-helper';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { InformationCircleFreeIcons } from '@hugeicons/core-free-icons';
import { DEFAULT_ACTIVE_LOAN_AMOUNT } from '@/src/constants/data';
import { IMAGES } from '@/src/constants/images';
import { StatusStrip } from './StatusStrip';

const TOP_BAR_HEIGHT = 6;
const ICON_BOX_SIZE = 30;

export interface PreOfferCardProps {
  /** Main heading line (e.g. "Instant Loan up to") */
  heading?: string;
  /** Optional amount shown in primary color below heading */
  amount?: number;
  /** Subtitle (e.g. "Check eligibility in 30 seconds") */
  description?: string;
  /** Optional icon in top-left box; add Image when asset is ready */
  illustrationSource?: ImageSourcePropType;
  /** Optional pill on top-right (e.g. "Pre-Approved") */
  statusPill?: string;
  /** When 'warning', show title as amber under-review badge instead of icon row */
  titleBadgeVariant?: 'warning';
  /** Optional title when showing under-review badge */
  title?: string;
  /** Footer line below CTA (e.g. "No impact on credit score") */
  footerMessage?: string;
  /** When true, backend is still resolving the stage (retryStage) — show a checking-eligibility loader instead of the CTA. */
  isCheckingEligibility?: boolean;
  /** Stepper + action message + CTA from section */
  children: React.ReactNode;
}

export function PreOfferCard({
  heading = 'Instant Loan up to',
  description = 'Check eligibility in 30 seconds',
  amount = DEFAULT_ACTIVE_LOAN_AMOUNT,
  illustrationSource,
  statusPill,
  titleBadgeVariant,
  title = 'Check loan offers',
  footerMessage = 'No impact on credit score',
  isCheckingEligibility = false,
  children,
}: PreOfferCardProps) {
  const showUnderReviewBadge = titleBadgeVariant === 'warning';

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        <Image
          source={IMAGES.GRID_IMAGE}
          style={styles.gridBackground}
          resizeMode="cover"
        />

        <StatusStrip
          statusLabel={showUnderReviewBadge ? title : statusPill}
          pillTextWeight={showUnderReviewBadge ? 'semiBold' : 'bold'}
          uppercaseLabel={!showUnderReviewBadge}
          pillStyle={showUnderReviewBadge ? styles.underReviewBadge : undefined}
          pillTextStyle={showUnderReviewBadge ? styles.underReviewBadgeText : styles.pillText}
        />

        <View style={styles.content}>

          {/* Icon + heading row */}
          <View style={styles.headerRow}>
            <View style={styles.iconBoxLarge}>
              <Image
                source={IMAGES.BIG_LOGO}
                style={styles.iconImageLarge}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headingBlock}>
              {heading ? (
                <AppText variant="h3" weight="semiBold" style={styles.headingText}>
                  {heading}
                </AppText>
              ) : null}
              {amount != null && typeof amount === 'number' && (
                <AppText
                  variant="h3"
                  weight="semiBold"
                  style={styles.amountText}
                  color="primary"
                >
                  {formatCurrency(amount)}
                </AppText>
              )}
            </View>
          </View>

          {/* Feature badges row */}
          <View style={styles.featureRow}>
            <View style={styles.featureChip}>
              <AppText
                variant="captionSmall"
                weight="medium"
                style={styles.featureChipText}
              >
                Zero Foreclosure Charges
              </AppText>
            </View>
            <View style={styles.featureChip}>
              <AppText
                variant="captionSmall"
                weight="medium"
                style={styles.featureChipText}
              >
                No Paperwork
              </AppText>
            </View>
          </View>

          {isCheckingEligibility ? (
            <View style={styles.checkingEligibilityRow}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : (
            children
          )}

          {footerMessage != null && footerMessage.length > 0 && (
            <View style={styles.footer}>
              <HugeiconsIcon
                icon={InformationCircleFreeIcons}
                size={14}
                color={colors.text.gray}
              />
              <AppText variant="captionSmall" style={styles.footerText}>
                {footerMessage}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: colors.primary.lightest,
    backgroundColor: colors.background.primary,
    paddingTop: spacing.sm,
    ...shadows.md,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gridBackground: {
    ...StyleSheet.absoluteFill,
    opacity: 0.08,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconBoxLarge: {
    // width: 56,
    // height: 56,
    // borderRadius: radius.full,
    
    // backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImageLarge: {
    width: 62,
    height: 62,
  },
  pillText: {
    color: colors.primary.main,
    fontSize: typography.fontSize.xxs,
    letterSpacing: 0.5,
  },
  headingBlock: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  headingText: {
    color: colors.text.primary,
    fontSize: typography.fontSize['2xl'],
    lineHeight: 32,
  },
  amountText: {
    color: colors.primary.main,
    fontSize: typography.fontSize['2xl'],
    lineHeight: 32,
    marginTop: spacing.xs,
  },
  description: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  footerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text.tertiary,
  },
  footerText: {
    color: colors.text.gray,
    // fontSize: typography.fontSize.xs,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  featureChip: {
    // flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.lightest_2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureChipText: {
    color: colors.primary.main,
    fontSize: 9,
  },
  underReviewBadge: {
    backgroundColor: colors.warning.bg,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  underReviewBadgeText: {
    color: colors.warning.dark,
    fontSize: typography.fontSize.xs,
  },
  checkingEligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary.lightest_2,
  },
  checkingEligibilityText: {
    color: colors.primary.main,
  },
});

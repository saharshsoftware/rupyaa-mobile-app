import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Check, ChevronDown, ChevronUp, Lock } from 'lucide-react-native';
import { IMAGES } from '@/src/constants/images';
import { colors, radius, shadows, spacing } from '@/src/theme';
import { AppText } from '@/src/components/AppText';
import { VERIFIED_OFFER_STATUS } from './verifiedOfferStatus.constants';
import { getVerifiedActiveLoanTitle } from './verifiedOfferStatus.logic';
import type {
  ActiveLoanCardProps,
  BlurredAmountProps,
  LoanDetailsBreakdownRowProps,
  LockedLoanRowProps,
  LockedTierProps,
  VerifiedOfferStatusContentProps,
} from './VerifiedOfferStatusContent.types';

export function VerifiedOfferStatusContent({
  isOfferScreen = false,
  expandableLoanDetails,
}: VerifiedOfferStatusContentProps): React.JSX.Element {
  const activeLoanTitle = getVerifiedActiveLoanTitle();
  const styleCard = styles.creditCard;
  const lockedLoanRows = VERIFIED_OFFER_STATUS.lockedLoans.map((loan) => (
    <LockedLoanRow
      key={loan.loanNumber}
      loanNumber={loan.loanNumber}
      amountLabel={loan.amountLabel}
      subtitle={loan.subtitle}
      moreLabel={loan.moreLabel}
    />
  ));

  const renderLoanAmountHeader = () => {
    if (isOfferScreen) return null;
    return (
      <>
      <AppText style={styles.amountEyebrow} variant="captionSmall" weight="semiBold">
        YOUR LOAN AMOUNT
      </AppText>
      <AppText style={styles.verifiedAmount} weight="semiBold">
        {VERIFIED_OFFER_STATUS.currentAmountLabel}
      </AppText>
      <View style={styles.tierBadge}>
        <View style={styles.tierBadgeDot} />
        <AppText style={styles.tierBadgeText} variant="caption" weight="regular">
          {VERIFIED_OFFER_STATUS.tierLabel}
        </AppText>
      </View>
      </>
    );
  }

  return (
    <View style={styles.container}>
      {renderLoanAmountHeader()}
      {!isOfferScreen && (
        <>
          <AppText style={styles.unlockHint} variant="caption" weight="medium">
            {VERIFIED_OFFER_STATUS.nextUnlockHint}
          </AppText>
          {lockedLoanRows}
        </>
      )}
      <View style={styleCard}>
        <View style={styles.creditHeader}>
          <AppText style={styles.creditTitle} variant="bodyLarge" weight="semiBold">
            Your credit offer
          </AppText>
          <AppText style={styles.unlockedText} variant="captionSmall" weight="medium">
            {VERIFIED_OFFER_STATUS.unlockedLabel}
          </AppText>
        </View>
        {!isOfferScreen && <OfferTierTimeline />}
        <ActiveLoanCard
          loanNumber={VERIFIED_OFFER_STATUS.activeLoan.loanNumber}
          title={activeLoanTitle}
          subtitle={VERIFIED_OFFER_STATUS.activeLoan.subtitle}
          status={VERIFIED_OFFER_STATUS.activeLoan.status}
          expandableLoanDetails={expandableLoanDetails}
        />
        {isOfferScreen && (
          <AppText style={styles.creditUnlockHint} variant="caption" weight="medium">
            {VERIFIED_OFFER_STATUS.nextUnlockHint}
          </AppText>
        )}
      </View>
      
    </View>
  );
}

function LoanDetailsBreakdownRow({ label, value, strong = false }: LoanDetailsBreakdownRowProps) {
  return (
    <View style={styles.breakdownRow}>
      <AppText
        style={strong ? styles.breakdownStrong : styles.breakdownLabel}
        variant="caption"
        weight={strong ? 'bold' : 'regular'}
      >
        {label}
      </AppText>
      <AppText
        style={strong ? styles.breakdownStrong : styles.breakdownValue}
        variant="caption"
        weight={strong ? 'bold' : 'semiBold'}
      >
        {value}
      </AppText>
    </View>
  );
}

function ActiveLoanCard({
  loanNumber,
  title,
  subtitle,
  status,
  expandableLoanDetails,
}: ActiveLoanCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandable = expandableLoanDetails != null;
  const toggleExpanded = useCallback(() => {
    if (!isExpandable) return;
    setIsExpanded((current) => !current);
  }, [isExpandable]);

  const breakdownRows = expandableLoanDetails?.breakdownRows.map((row) => (
    <LoanDetailsBreakdownRow
      key={`active-loan-${row.label}`}
      label={row.label}
      value={row.value}
      strong={row.strong}
    />
  ));

  let expandIndicatorNode: React.ReactNode = null;
  if (isExpandable) {
    expandIndicatorNode = isExpanded ? (
      <ChevronUp size={18} color={colors.primary.main} />
    ) : (
      <ChevronDown size={18} color={colors.text.secondary} />
    );
  }

  let breakdownNode: React.ReactNode = null;
  if (isExpandable && isExpanded && expandableLoanDetails) {
    breakdownNode = (
      <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(120)} style={styles.breakdown}>
        {breakdownRows}
        <View style={styles.breakdownDivider} />
        <LoanDetailsBreakdownRow
          label={expandableLoanDetails.totalLabel}
          value={expandableLoanDetails.totalValue}
          strong
        />
      </Animated.View>
    );
  }

  const cardContent = (
    <>
      <View style={styles.activeLoanHeader}>
        <View style={styles.activeLoanLeft}>
          <View style={styles.activeLoanNumber}>
            <AppText style={styles.activeLoanNumberText} variant="bodyLarge" weight="bold">
              {loanNumber}
            </AppText>
          </View>
          <View style={styles.loanTextBlock}>
            <AppText style={styles.activeLoanTitle} variant="caption" weight="semiBold">
              {title}
            </AppText>
            <AppText style={styles.activeLoanSubtitle} variant="captionSmall" weight="medium">
              {subtitle}
            </AppText>
          </View>
        </View>
        <View style={styles.activeLoanTrailing}>
          <View style={styles.activePill}>
            <AppText style={styles.activePillText} variant="captionExtraSmall" weight="bold">
              {status}
            </AppText>
          </View>
          {expandIndicatorNode}
        </View>
      </View>
      {breakdownNode}
    </>
  );

  if (isExpandable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.activeLoanCard, pressed ? styles.activeLoanCardPressed : null]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return <View style={styles.activeLoanCard}>{cardContent}</View>;
}

function OfferTierTimeline(): React.JSX.Element {
  const lockedTiers = VERIFIED_OFFER_STATUS.lockedLoans.map((loan) => (
    <LockedTier key={loan.loanNumber} amountLabel={loan.amountLabel} />
  ));

  return (
    <View style={styles.timeline}>
      <View style={styles.timelineTrack} />
      <View style={styles.timelineProgress} />
      <View style={styles.timelineSteps}>
        <View style={styles.timelineStep}>
          <View style={styles.completedTierCircle}>
            <Check size={16} color={colors.text.inverse} strokeWidth={3} />
          </View>
          <AppText style={styles.completedTierLabel} variant="caption" weight="bold">
            {VERIFIED_OFFER_STATUS.currentAmountLabel}
          </AppText>
        </View>
        {lockedTiers}
      </View>
    </View>
  );
}

function LockedTier({ amountLabel }: LockedTierProps): React.JSX.Element {
  return (
    <View style={styles.timelineStep}>
      <View style={styles.lockedTierCircle}>
        <Lock size={14} color={colors.text.tertiary} strokeWidth={2} />
      </View>
      <BlurredAmount amountLabel={amountLabel} />
    </View>
  );
}

function LockedLoanRow({
  loanNumber,
  amountLabel,
  subtitle,
  moreLabel,
}: LockedLoanRowProps): React.JSX.Element {
  return (
    <View style={styles.lockedLoanRow}>
      <View style={styles.lockedLoanLeft}>
        <View style={styles.lockedLoanIcon}>
          <Lock size={14} color={colors.text.tertiary} strokeWidth={2} />
        </View>
        <View style={styles.loanTextBlock}>
          <View style={styles.lockedLoanTitleRow}>
            <AppText style={styles.lockedLoanTitle} variant="caption" weight="bold">
              Loan {loanNumber} •
            </AppText>
            <BlurredAmount amountLabel={amountLabel} />
          </View>
          <AppText style={styles.lockedLoanSubtitle} variant="captionSmall" weight="medium">
            {subtitle}
          </AppText>
        </View>
      </View>
      <View style={styles.morePill}>
        <AppText style={styles.morePillText} variant="captionSmall" weight="medium">
          upto {moreLabel}
        </AppText>
      </View>
    </View>
  );
}

function BlurredAmount({ amountLabel }: BlurredAmountProps): React.JSX.Element {
  return (
    <View style={styles.blurredAmountContainer}>
      <AppText style={styles.blurredAmountText} variant="caption" weight="bold">
        {amountLabel}
      </AppText>
      <Image
        source={IMAGES.BLURRED_PRICE}
        resizeMode="stretch"
        style={styles.blurredAmountImage}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    width: '100%',
  },
  amountEyebrow: {
    color: colors.text.gray,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  verifiedAmount: {
    color: colors.primary.main,
    fontSize: 48,
    lineHeight: 56,
    marginBottom: spacing.base,
  },
  tierBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary.lightest_2,
    borderColor: colors.primary.main,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  tierBadgeDot: {
    backgroundColor: colors.primary.main,
    borderRadius: radius.full,
    height: spacing.sm,
    width: spacing.sm,
  },
  tierBadgeText: {
    color: colors.primary.main,
  },
  creditCard: {
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    gap: spacing.xl,
    padding: spacing.lg,
    width: '100%',
    ...shadows.sm,
    marginTop: spacing.md,
  },
  creditHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditTitle: {
    color: colors.text.primary,
  },
  unlockedText: {
    color: colors.primary.main,
    fontSize: 12,
  },
  timeline: {
    paddingHorizontal: spacing.sm,
    position: 'relative',
  },
  timelineTrack: {
    backgroundColor: colors.border.light,
    borderRadius: radius.full,
    height: 4,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: 17,
  },
  timelineProgress: {
    backgroundColor: colors.primary.main,
    borderRadius: radius.full,
    height: 4,
    left: spacing.lg,
    position: 'absolute',
    top: 17,
    width: '25%',
  },
  timelineSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    minWidth: 50,
  },
  completedTierCircle: {
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    borderColor: colors.background.primary,
    borderRadius: radius.full,
    borderWidth: 4,
    height: 36,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 36,
    ...shadows.sm,
  },
  lockedTierCircle: {
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 36,
  },
  completedTierLabel: {
    color: colors.primary.main,
  },
  creditUnlockHint: {
    color: colors.text.gray,
    textAlign: 'center',
  },
  activeLoanCard: {
    backgroundColor: colors.primary.lightest_2,
    borderColor: colors.primary.lightest,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.base,
  },
  activeLoanCardPressed: {
    opacity: 0.92,
  },
  activeLoanHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activeLoanLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  activeLoanNumber: {
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  activeLoanNumberText: {
    color: colors.text.inverse,
  },
  loanTextBlock: {
    flex: 1,
    marginLeft: spacing.base,
    minWidth: 0,
  },
  activeLoanTitle: {
    color: colors.text.primary,
  },
  activeLoanSubtitle: {
    color: colors.text.secondary,
  },
  activeLoanTrailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  activePill: {
    backgroundColor: colors.primary.main,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  breakdown: {
    borderTopColor: colors.border.detailsAccent,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.base,
    paddingTop: spacing.base,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    color: colors.text.secondary,
  },
  breakdownValue: {
    color: colors.text.primary,
  },
  breakdownStrong: {
    color: colors.text.primary,
  },
  breakdownDivider: {
    backgroundColor: colors.border.detailsAccent,
    height: 1,
    marginBottom: spacing.sm,
  },
  activePillText: {
    color: colors.text.inverse,
    letterSpacing: 0.25,
  },
  unlockHint: {
    color: colors.text.gray,
    marginVertical: spacing.base,
    textAlign: 'center',
  },
  lockedLoanRow: {
    alignItems: 'center',
    borderColor: colors.border.light,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.base,
    minHeight: 72,
    padding: spacing.base,
    width: '100%',
  },
  lockedLoanLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  lockedLoanIcon: {
    alignItems: 'center',
    backgroundColor: colors.text.quaternary,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  lockedLoanTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  lockedLoanTitle: {
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  blurredAmountContainer: {
    // borderRadius: radius.sm,
    height: 18,
    minWidth: 58,
    overflow: 'hidden',
    position: 'relative',
  },
  blurredAmountText: {
    color: colors.transparent,
    paddingHorizontal: spacing.xs,
  },
  blurredAmountImage: {
    bottom: -spacing.xs,
    left: -spacing.xs,
    position: 'absolute',
    right: -spacing.xs,
    top: -spacing.xs,
  },
  lockedLoanSubtitle: {
    color: colors.text.secondary,
  },
  morePill: {
    alignItems: 'center',
    backgroundColor: colors.primary.lightest_2,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  morePillText: {
    color: colors.primary.main,
    lineHeight: 15,
  },
});

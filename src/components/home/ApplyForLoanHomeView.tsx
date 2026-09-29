import React, { useMemo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, SvgUri } from 'react-native-svg';
import { AppText } from '../AppText';
import { LimitHeroCard } from './LimitHeroCard';
import { IMAGES } from '@/src/constants/images';
import { colors, radius, spacing, typography } from '@/src/theme';
import { getMainStepLabels, type FlowPhase } from '@/src/config/flowSteps';
import { useFlowStore } from '@/src/store/useFlowStore';
import journeyDetailsIcon from '@/assets/images/journey-details.svg';
import journeyKycIcon from '@/assets/images/journey-kyc.svg';
import journeyVerifyIcon from '@/assets/images/journey-verify.svg';
import journeyFundsIcon from '@/assets/images/journey-funds.svg';

interface ApplyForLoanHomeViewProps {
  amount: number;
  actionLabel: string;
  heroContent?: React.ReactNode;
  hideJourney?: boolean;
  hideJourneyProgress?: boolean;
  onApplyPress?: () => void;
  onCreditScorePress: () => void;
  onContactPress: () => void;
}

const howItWorks = [
  { number: '1', title: 'Fill Details', description: 'PAN & basic information.' },
  { number: '2', title: 'Complete KYC', description: 'Aadhaar, OTP, Paperless' },
  { number: '3', title: 'Receive Money', description: 'Get the funds in 10 minutes.' },
] as const;

const journeyIcons = [journeyDetailsIcon, journeyKycIcon, journeyVerifyIcon, journeyFundsIcon];

function StylizedWatermarkU(): React.JSX.Element {
  return (
    <Svg width={54} height={76} viewBox="0 0 54 76" accessibilityLabel="u">
      <Circle cx={13} cy={9} r={6} fill={colors.primary.opacity40} />
      <Circle cx={41} cy={9} r={6} fill={colors.primary.opacity40} />
      <Path
        d="M9 25V45C9 60 18 68 27 68C36 68 45 60 45 45V25"
        fill="none"
        stroke={colors.primary.opacity40}
        strokeWidth={12}
        strokeLinecap="butt"
      />
    </Svg>
  );
}

function getStepLineStyle(
  index: number,
  phaseIndex: number,
  passedPhases: Record<FlowPhase, boolean>,
  stepId: string,
): StyleProp<ViewStyle> {
  const isPassed = Boolean(passedPhases[stepId as FlowPhase]) || index < phaseIndex;
  const isCurrent = index === phaseIndex && !isPassed;
  if (isPassed) {
    return [styles.stepLine, styles.stepLineCompleted];
  }
  if (isCurrent) {
    return [styles.stepLine, styles.stepLineActive];
  }
  return styles.stepLine;
}

export function ApplyForLoanHomeView({
  amount,
  actionLabel,
  heroContent,
  hideJourney = false,
  hideJourneyProgress = false,
  onApplyPress,
  onCreditScorePress,
  onContactPress,
}: ApplyForLoanHomeViewProps) {
  const phaseIndex = useFlowStore((state) => state.phaseIndex);
  const passedPhases = useFlowStore((state) => state.passedPhases);
  const journeySteps = useMemo(() => getMainStepLabels(), []);
  const journeyTitle = `Loan in ${journeySteps.length} Easy Steps`;
  const journeyActionLabel = heroContent ? actionLabel : 'Complete Your Details';
  const showJourneyAction = typeof onApplyPress === 'function';
  const journeyIcon = journeyIcons[phaseIndex] ?? journeyDetailsIcon;

  return (
    <View style={styles.container}>
      {heroContent ?? (
        <LimitHeroCard
          amount={amount}
          actionLabel={actionLabel}
          onActionPress={onApplyPress}
          caption="Cash in your bank in 10 minutes."
        />
      )}

      {!hideJourney ? (
        <View style={styles.journeyCard}>
          {!hideJourneyProgress ? (
            <>
              <AppText variant="caption" weight="semiBold" style={styles.journeyTitle}>
                {journeyTitle}
              </AppText>
              <View style={styles.progressTrack}>
                {journeySteps.map((step, index) => (
                  <View style={styles.step} key={step.id}>
                    <View style={getStepLineStyle(index, phaseIndex, passedPhases, step.id)} />
                    <AppText style={styles.stepLabel} variant="captionExtraSmall">
                      {step.label}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {showJourneyAction ? (
            <TouchableOpacity style={styles.detailsRow} onPress={onApplyPress} activeOpacity={0.85}>
              <View style={styles.shield}>
                <SvgUri uri={Image.resolveAssetSource(journeyIcon).uri} width={20} height={20} />
              </View>
              <View style={styles.detailsCopy}>
                <AppText style={styles.detailsTitle} variant="captionSmall" weight="semiBold">
                  {journeyActionLabel}
                </AppText>
                <AppText style={styles.mutedSmall} variant="captionExtraSmall">
                  5 Minutes away from your Funds.
                </AppText>
              </View>
              <View style={styles.arrowCircle}>
                <ArrowRight size={14} color={colors.text.inverse} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.twoColumnRow}>
        <View style={styles.helpCard}>
          <AppText style={styles.helpTitle} variant="body" weight="semiBold">
            Need Help?
          </AppText>
          <AppText style={styles.helpDescription} variant="captionSmall">
            Our support team is available{'\n'}
            <AppText style={styles.helpDescriptionStrong} variant="captionSmall" weight="semiBold">
              24/7
            </AppText>
            .
          </AppText>
          <TouchableOpacity style={styles.contactButton} onPress={onContactPress} activeOpacity={0.85}>
            <AppText style={styles.contactButtonText} variant="captionSmall" weight="semiBold">
              Contact Us
            </AppText>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.creditCard} onPress={onCreditScorePress} activeOpacity={0.85}>
          <View style={styles.limitedOfferBadge}>
            <AppText style={styles.limitedOfferText} variant="captionExtraSmall" weight="semiBold">
              Limited Offer
            </AppText>
          </View>
          <Image
            source={IMAGES.HOME_CREDIT_SCORE}
            style={styles.creditImage}
            resizeMode="contain"
            accessibilityLabel="Check credit score"
          />
          <AppText style={styles.whiteText} variant="caption" weight="semiBold">
            Check Credit Score
          </AppText>
          <AppText style={styles.creditDescription} variant="captionExtraSmall">
            Know your credit health, For{' '}
            <AppText style={styles.freeText} variant="captionSmall" weight="semiBold">
              FREE
            </AppText>
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <LinearGradient
          colors={[colors.background.primary, colors.border.light, colors.text.gray]}
          locations={[0, 0.35, 1]}
          style={styles.divider}
        />
        <AppText style={styles.dividerText} variant="caption">
          How it works
        </AppText>
        <LinearGradient
          colors={[colors.text.gray, colors.border.light, colors.background.primary]}
          locations={[0, 0.65, 1]}
          style={styles.divider}
        />
      </View>
      <View style={styles.howRow}>
        {howItWorks.map((item, index) => (
          <View key={item.number} style={[styles.howCard, index === 2 && styles.howCardActive]}>
            <AppText style={[styles.number, index === 2 && styles.numberActive]} weight="semiBold">
              {item.number}
            </AppText>
            <AppText style={styles.howTitle} variant="caption" weight="semiBold">
              {item.title}
            </AppText>
            <AppText
              style={[styles.howDescription, index === 0 && styles.fillDetailsDescription]}
              variant="captionExtraSmall"
            >
              {item.description}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.wordmarkRow}>
        <AppText style={styles.wordmark} weight="bold">
          R
        </AppText>
        <StylizedWatermarkU />
        <AppText style={styles.wordmark} weight="bold">
          pyaa
        </AppText>
      </View>
      <AppText style={styles.tagline} variant="captionSmall" align="center">
        Choti si need, Badi si Smile.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  journeyCard: {
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.lightest_2,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  journeyTitle: { color: colors.text.black },
  progressTrack: { flexDirection: 'row', marginTop: spacing.md, marginBottom: spacing.sm },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs },
  stepLine: {
    width: '82%',
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary.lightest,
  },
  stepLineActive: { backgroundColor: colors.primary.main },
  stepLineCompleted: { backgroundColor: colors.text.black },
  stepLabel: { color: colors.text.gray },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.opacity40,
    borderWidth: 1,
    borderColor: colors.border.detailsAccent,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  shield: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCopy: { flex: 1, marginHorizontal: spacing.sm },
  detailsTitle: { color: colors.text.black },
  mutedSmall: { color: colors.text.gray },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.text.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoColumnRow: { flexDirection: 'row', gap: spacing.sm },
  creditCard: {
    flex: 1,
    minHeight: 150,
    backgroundColor: colors.text.black,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  limitedOfferBadge: {
    position: 'absolute',
    top: 0,
    right: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primary.main,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  limitedOfferText: { color: colors.text.inverse },
  freeText: { color: colors.primary.main },
  creditImage: { width: 80, height: 80, alignSelf: 'center' },
  whiteText: { color: colors.text.inverse },
  creditDescription: { color: colors.text.lightGray },
  helpCard: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.lightest_2,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  helpTitle: { color: colors.text.black },
  helpDescription: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: 'auto',
  },
  helpDescriptionStrong: { color: colors.text.secondary },
  contactButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.main,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.base,
  },
  contactButtonText: { color: colors.text.black },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { flex: 1, height: 1, borderRadius: radius.full },
  dividerText: { color: colors.text.gray },
  howRow: { flexDirection: 'row', gap: spacing.sm },
  howCard: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.lightest_2,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  howCardActive: { backgroundColor: colors.primary.main },
  number: {
    color: colors.primary.main,
    fontSize: typography.fontSize['5xl'],
    lineHeight: typography.fontSize['5xl'],
  },
  numberActive: { color: colors.text.black },
  howTitle: {
    color: colors.text.black,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  howDescription: {
    color: colors.text.black,
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
  fillDetailsDescription: {
    marginTop: spacing.md,
  },
  wordmarkRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: colors.primary.opacity40,
    fontSize: 76,
    lineHeight: 88,
    letterSpacing: -2,
  },
  tagline: { color: colors.text.primary, marginBottom: spacing.md },
});

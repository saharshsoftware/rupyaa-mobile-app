import React, { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFlowStore } from '@/src/store/useFlowStore';
import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import { colors, spacing, typography } from '@/src/theme';
import { ContactSupport } from './ContactSupport';
import { AppText } from './AppText';
import { Button } from './Button';
import { IMAGES } from '@/src/constants/images';
import { consoleLogDev, formatCurrency } from '@/src/utils/common-helper';
import { getOfferAmount } from '@/src/types/offer';
import { isStarterTierVerifiedOffer } from './offer-status/verifiedOfferStatus.logic';

export interface OfferStatusModalProps {
  visible: boolean;
  onCheckOffers: () => void;
  onBackToHome: () => void;
  isCheckingOffers?: boolean;
}

const VerifiedOfferStatusContent = React.lazy(() =>
  import('./offer-status/VerifiedOfferStatusContent').then((module) => ({
    default: module.VerifiedOfferStatusContent,
  })),
);

const ANIMATION_DURATION = 280;
const SLIDE_OFFSET = 32;
const SPRING_TENSION = 70;
const SPRING_FRICTION = 11;
const ILLUSTRATION_SIZE = 200;
const OVERLAY_Z_INDEX = 9999;

/**
 * Full-screen offer status overlay (Verified / Pending / Rejected), same rendering
 * strategy as IneligibilityModal so it transitions with the screen.
 *
 * Variant is read from useFlowStore.offerStatusVariant — set atomically alongside
 * showOfferStatusModal to avoid cross-store race conditions that caused the
 * "No Offer Available" screen to flash before the correct variant rendered.
 *
 * Flow: Modal is opened from BankConnectStep (or from bureau/SoftPull). User then
 * taps "Check Offers" (Verified) or "Back to Home" (Pending/Rejected); "Check Offers"
 * navigates to ApprovedOfferStep.
 *
 * VerifiedOfferStatusContent (tier unlock UI) is shown only for starter-tier offers
 * of exactly ₹1,200; all other verified amounts keep the default congratulations UI.
 */
export function OfferStatusModal({
  visible,
  onCheckOffers,
  onBackToHome,
  isCheckingOffers = false,
}: OfferStatusModalProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const variant = useFlowStore((s) => s.offerStatusVariant) ?? 'Verified';
  const lastResponse = useCurrentOfferStore((s) => s.lastResponse);
  const offerAmount = getOfferAmount(lastResponse) ?? null;
  const showStarterTierVerified =
    variant === 'Verified' && isStarterTierVerifiedOffer(offerAmount);

  if (visible) {
    consoleLogDev('[OfferStatusModal] Visible, variant:', variant);
  }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SLIDE_OFFSET)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: SPRING_TENSION,
        friction: SPRING_FRICTION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  const renderBody = (): React.JSX.Element => {
    if (variant === 'Verified') {
      if (showStarterTierVerified) {
        return (
          <React.Suspense fallback={null}>
            <VerifiedOfferStatusContent />
          </React.Suspense>
        );
      }
      const amountLabel =
        offerAmount != null ? formatCurrency(offerAmount) : 'Loan';
      return (
        <>
          <Image
            source={IMAGES.OFFER_STATUS_VERIFIED}
            resizeMode="contain"
            style={styles.illustration}
            accessibilityLabel="Offer ready illustration"
          />
          <AppText style={styles.title} variant="h2" weight="semiBold">
            Congratulations 🎉
          </AppText>
          <AppText style={styles.offerAmount} variant="h1" weight="semiBold">
            {amountLabel}
          </AppText>
          <AppText style={styles.offerReadyAmount} variant="bodyLarge">
            Loan Offer Ready
          </AppText>
          <AppText style={styles.subtitle} variant="bodyLarge">
            Your loan has been approved. Please review the details to continue
          </AppText>
        </>
      );
    }
    if (variant === 'Pending') {
      return (
        <>
          <Image
            source={IMAGES.OFFER_STATUS_PENDING}
            resizeMode="contain"
            style={styles.illustration}
            accessibilityLabel="Application under review illustration"
          />
          <AppText style={styles.title} variant="h4" weight="semiBold">
            Your Application is Under Review
          </AppText>
          <AppText style={styles.subtitle} variant="caption">
            {"We're verifying your details. This may take a few minutes — we'll notify you once it's done"}
          </AppText>
        </>
      );
    }
    return (
      <>
        <Image
          source={IMAGES.NO_OFFER_AVAILABLE_ILLUSTRATION}
          resizeMode="contain"
          style={styles.illustration}
          accessibilityLabel="No offer available illustration"
        />
        <AppText style={styles.title} variant="h4" weight="semiBold">
          No Offer Available Right Now
        </AppText>
        <AppText style={styles.subtitle} variant="caption">
          {t("No offer at the moment. \nBut your ZapCash journey isn't over")}
        </AppText>
        <View style={styles.badgeContainer}>
          <View style={styles.badgeDot} />
          <AppText style={styles.badgeText} variant="caption" weight="regular">
            NEXT REVIEW IN 30 DAYS
          </AppText>
        </View>
      </>
    );
  };

  const isVerified = variant === 'Verified';
  let footerAction: ReactNode;
  if (isVerified) {
    footerAction = (
      <Button
        variant="primary"
        size="large"
        fullWidth
        onPress={onCheckOffers}
        disabled={isCheckingOffers}
        loading={isCheckingOffers}
        accessibilityLabel="Review Offer"
      >
        Review Offer
      </Button>
    );
  } else {
    footerAction = (
      <Button
        variant="primary"
        size="large"
        fullWidth
        onPress={onBackToHome}
        accessibilityLabel="Back to Home"
      >
        Back to Home
      </Button>
    );
  }

  let scrollContentStyle: StyleProp<ViewStyle> = styles.scrollContent;
  if (showStarterTierVerified) {
    scrollContentStyle = styles.scrollContentStarter;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top, opacity: fadeAnim },
      ]}
    >
      <ScrollView
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[styles.body, { transform: [{ translateY: slideAnim }] }]}
        >
          {renderBody()}
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(
              insets.bottom + spacing.base,
              spacing['2xl']
            ),
          },
        ]}
      >
        <ContactSupport />
        {footerAction}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background.primary,
    zIndex: OVERLAY_Z_INDEX,
    elevation: OVERLAY_Z_INDEX,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  scrollContentStarter: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  body: {
    alignItems: 'center',
    width: '100%',
  },
  illustration: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  offerAmount: {
    color: colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  offerReadyAmount: {
    color: colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    fontSize: typography.fontSize['2xl'],
    marginBottom: spacing.lg,
  },
  subtitle: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.lightest,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.base,
    marginBottom: spacing.xl,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginRight: spacing.sm,
  },
  badgeText: {
    color: colors.primary.main,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: colors.background.primary,
  },
});

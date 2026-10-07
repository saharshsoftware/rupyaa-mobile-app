import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/src/theme';
import { ContactSupport } from './ContactSupport';
import { AppText } from './AppText';
import { Button } from './Button';
import { RupyaaLogo } from './RupyaaLogo';
import { IMAGES } from '../constants/images';
import { commonStyles } from '../utils/common-styles';

export interface UnderReviewModalProps {
  /** Controls whether the overlay is visible */
  visible: boolean;
  /** Status message shown to the user */
  message?: string;
  /** Heading shown above the message */
  title?: string;
  /** Label for the primary action button */
  ctaLabel?: string;
  /** Called when the primary CTA button is pressed */
  onCtaPress: () => void;
}

const ANIMATION_DURATION = 280;
const SLIDE_OFFSET = 32;
const SPRING_TENSION = 70;
const SPRING_FRICTION = 11;
/** Line height in px for the body message — matches Poppins bodyLarge at 18px with relaxed leading. */
const MESSAGE_LINE_HEIGHT = 22;
/** z-order that guarantees this overlay sits above all step form content within the same screen. */
const OVERLAY_Z_INDEX = 9999;

const DEFAULT_TITLE = 'Manual Review in progress';
/** Single-string form of the default copy — used for the `message` default and for custom-override checks. */
const DEFAULT_MESSAGE = [
  "We're carefully reviewing your details.",
  'This process may take up to 3 days.',
  "No action is needed from your side. We'll notify you once the review is done.",
  'You can check your status anytime in the app.',
].join(' ');
const DEFAULT_CTA_LABEL = 'Proceed to Homepage';

/**
 * Full-screen "under review" overlay rendered as an absolutely-positioned view
 * rather than a React Native <Modal>.
 *
 * Same rendering strategy as IneligibilityModal: by being part of the screen's
 * own view hierarchy the overlay transitions away together with the rest of the
 * screen during Expo Router navigation, preventing any flash of underlying content.
 *
 * Shown when the backend returns `userStage === APPLICATION_STATUS`. This stage
 * may be removed in a future iteration — keeping the trigger co-located with the
 * stage check in LoanWizard makes it easy to delete.
 */
export function UnderReviewModal({
  visible,
  message = DEFAULT_MESSAGE,
  title = DEFAULT_TITLE,
  ctaLabel = DEFAULT_CTA_LABEL,
  onCtaPress,
}: UnderReviewModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top, opacity: fadeAnim },
      ]}
    >
      {/* <LinearGradient
        pointerEvents="none"
        colors={[
          colors.primary.main,
          colors.primary.lightest_3,
          colors.background.primary,
        ]}
        locations={[0, 0.16, 0.32]}
        style={StyleSheet.absoluteFill}
      /> */}
      {/* <View style={styles.header}>
        <RupyaaLogo size="sm" />
      </View> */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[
            styles.body,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >

          <Image source={IMAGES.UNDER_REVIEW} style={commonStyles.image as ImageStyle} />

          <AppText variant="h4" weight="semiBold" style={styles.title}>
            {title}
          </AppText>

          <AppText variant="caption" style={styles.subtitle}>
            You’re pre-approved for a personalized loan offer based on your profile.
          </AppText>

          {message === DEFAULT_MESSAGE ? (
            <View style={styles.bulletList}>
              <View style={styles.bulletRow}>
                <AppText variant="caption" style={styles.bulletMark} accessibilityRole="text">
                  {'\u2022'}
                </AppText>
                <AppText variant="caption" style={styles.bulletText}>
                  We&apos;re carefully reviewing your details.
                </AppText>
              </View>
              <View style={styles.bulletRow}>
                <AppText variant="caption" style={styles.bulletMark} accessibilityRole="text">
                  {'\u2022'}
                </AppText>
                <AppText variant="caption" style={styles.bulletText}>
                  {t('This process may take up to')}{' '}
                  <AppText variant="caption" weight="bold" style={styles.messageEmphasis}>
                    3 days
                  </AppText>
                  {t('.')}
                </AppText>
              </View>
              <View style={styles.bulletRow}>
                <AppText variant="caption" style={styles.bulletMark} accessibilityRole="text">
                  {'\u2022'}
                </AppText>
                <AppText variant="caption" style={styles.bulletText}>
                  No action is needed from your side. We&apos;ll notify you once the review is done.
                </AppText>
              </View>
              <View style={styles.bulletRow}>
                <AppText variant="caption" style={styles.bulletMark} accessibilityRole="text">
                  {'\u2022'}
                </AppText>
                <AppText variant="caption" style={styles.bulletText}>
                  You can check your status anytime in the app.
                </AppText>
              </View>
            </View>
          ) : (
            <AppText variant="caption" style={styles.message}>
              {message}
            </AppText>
          )}
        </Animated.View>
      </ScrollView>

      {/* Fixed footer */}
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
        <Button variant="primary" size="large" fullWidth onPress={onCtaPress}>
          {ctaLabel}
        </Button>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    zIndex: OVERLAY_Z_INDEX,
    elevation: OVERLAY_Z_INDEX,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  body: {
    alignItems: 'center',
    width: '100%',
  },
  bulletList: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bulletMark: {
    color: colors.text.secondary,
    lineHeight: MESSAGE_LINE_HEIGHT,
    width: 20,
    fontSize: 18,
  },
  bulletText: {
    flex: 1,
    color: colors.text.secondary,
    lineHeight: MESSAGE_LINE_HEIGHT,
    textAlign: 'left',
    // fontSize: 12,
  },
  statusBadge: {
    backgroundColor: colors.warning.bg,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  statusBadgeText: {
    color: colors.warning.dark,
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontSize: 18,
  },
  subtitle: {
    color: colors.text.secondary,
    textAlign: 'center',
    // lineHeight: MESSAGE_LINE_HEIGHT,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: MESSAGE_LINE_HEIGHT,
  },
  messageEmphasis: {
    color: colors.text.secondary,
    lineHeight: MESSAGE_LINE_HEIGHT,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    // borderTopWidth: 1,
    // borderTopColor: colors.border.light,
    // backgroundColor: colors.background.primary,
  },
});

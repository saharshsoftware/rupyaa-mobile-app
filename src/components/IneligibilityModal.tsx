import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme';
import { ContactSupport } from './ContactSupport';
import { AppText } from './AppText';
import { Button } from './Button';
import { IMAGES } from '../constants/images';

export interface IneligibilityModalProps {
  /** Controls whether the overlay is visible */
  visible: boolean;
  /** Rejection/ineligibility message shown to the user */
  message: string;
  /** Optional heading shown above the message */
  title?: string;
  /** Label for the primary action button (defaults to "Go to Home") */
  ctaLabel?: string;
  /** Called when the primary CTA button is pressed */
  onCtaPress: () => void;
  /** Optional label for a secondary action (e.g. "Try Again Later") */
  secondaryCtaLabel?: string;
  /** Called when the optional secondary CTA is pressed */
  onSecondaryCtaPress?: () => void;
}

const ANIMATION_DURATION = 280;
const SLIDE_OFFSET = 32;
const SPRING_TENSION = 70;
const SPRING_FRICTION = 11;
/** Line height in px for the body message — matches Poppins bodyLarge at 18px with relaxed leading. */
const MESSAGE_LINE_HEIGHT = 26;
/** z-order that guarantees this overlay sits above all step form content within the same screen. */
const OVERLAY_Z_INDEX = 9999;

const DEFAULT_TITLE = 'Application Rejected';
const DEFAULT_CTA_LABEL = 'Contact support';

/**
 * Full-screen ineligibility overlay rendered as an absolutely-positioned view
 * rather than a React Native <Modal>.
 *
 * Using <Modal> causes the overlay to render in a separate native window layer.
 * During Expo Router's stack navigation transition the screen slides away while
 * the Modal's native dialog disappears independently, briefly exposing the
 * underlying loan-journey form. By rendering as absoluteFillObject the overlay
 * is part of the screen's own view hierarchy and transitions away together with
 * the rest of the screen — the user only ever sees the ineligibility UI.
 */
export function IneligibilityModal({
  visible,
  message,
  title = DEFAULT_TITLE,
  ctaLabel = DEFAULT_CTA_LABEL,
  onCtaPress,
  secondaryCtaLabel,
  onSecondaryCtaPress,
}: IneligibilityModalProps) {
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
          <Image
            source={IMAGES.APPLICATION_REJECTED}
            resizeMode="contain"
            style={styles.image}
            accessibilityRole="image"
            accessibilityLabel="Application Rejected"
          />
          <AppText variant="h4" weight="semiBold" style={styles.title}>
            {title}
          </AppText>

          <AppText variant="body" style={styles.message}>
            {message}
          </AppText>
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

        {secondaryCtaLabel && onSecondaryCtaPress && (
          <Button
            variant="text"
            size="large"
            fullWidth
            style={styles.secondaryButton}
            onPress={onSecondaryCtaPress}
          >
            {secondaryCtaLabel}
          </Button>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    // Ensure this renders above the step form content within the same screen.
    zIndex: OVERLAY_Z_INDEX,
    elevation: OVERLAY_Z_INDEX,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: spacing.xl,
  },
  body: {
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: MESSAGE_LINE_HEIGHT,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    // borderTopWidth: 1,
    // borderTopColor: colors.border.light,
    backgroundColor: colors.background.primary,
    gap: spacing.sm,
  },
  secondaryButton: {
    marginTop: spacing.xs,
  },
});

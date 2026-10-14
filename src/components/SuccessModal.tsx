import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { colors, spacing, radius } from '@/src/theme';
import { ContactSupport } from './ContactSupport';
import { AppText } from './AppText';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { windowHeight } from '../utils/common-helper';

interface SuccessModalProps {
  showContactSupport?: boolean;
  visible: boolean;
  onClose?: () => void;
  /** Label for dismiss button when `onClose` is set (default: "OK"). */
  closeLabel?: string;
  title?: string;
  message?: string;
  /** When provided, shows image instead of the check icon */
  imageSource?: ImageSourcePropType;
  /** Centered card over dim backdrop (not bottom sheet). */
  centered?: boolean;
  /** When true, modal covers full screen (centered content). When false, bottom sheet style. */
  fullScreen?: boolean;
  /** When true, renders as absolute overlay over parent (covers parent only, not full screen). Parent must have flex: 1. */
  renderAsOverlay?: boolean;
}

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CENTERED_CARD_MAX_WIDTH = SCREEN_WIDTH - spacing.xl * 2;

export function SuccessModal({
  visible,
  showContactSupport = false,
  onClose,
  closeLabel = 'OK',
  title = 'Verified!',
  message = 'Welcome aboard',
  imageSource,
  centered = false,
  fullScreen = false,
  renderAsOverlay = false,
}: SuccessModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const useScaleAnimation = fullScreen || renderAsOverlay || centered;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
          delay: useScaleAnimation ? 0 : 200,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      scaleAnim.setValue(0);
    }
  }, [visible, useScaleAnimation, slideAnim, scaleAnim]);

  const useLegacyOverlayStyle = (fullScreen || renderAsOverlay) && !centered;

  const overlayStyle = centered
    ? styles.overlayCentered
    : useLegacyOverlayStyle
      ? styles.overlayFullScreen
      : styles.overlay;

  const containerStyle = centered
    ? [styles.containerCentered, { maxWidth: CENTERED_CARD_MAX_WIDTH }]
    : useLegacyOverlayStyle
      ? [
          styles.container,
          styles.containerFullScreen,
          {
            paddingTop: spacing['3xl'] + insets.top,
            paddingBottom: spacing['4xl'] + insets.bottom,
          },
        ]
      : [styles.container, { paddingBottom: spacing.md + insets.bottom }];

  const transformStyle = useScaleAnimation
    ? { transform: [{ scale: scaleAnim }] as const }
    : { transform: [{ translateY: slideAnim }] as const };

  const content = (
    <View style={[overlayStyle, renderAsOverlay && styles.overlayAbsolute]}>
      <Animated.View style={[containerStyle, transformStyle]}>
        <Animated.View
          style={[
            styles.iconContainer,
            !useScaleAnimation && { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {imageSource ? (
            <Image source={imageSource} resizeMode="contain" style={styles.image} />
          ) : (
            <View style={styles.iconBackground}>
              <CheckCircle2
                size={64}
                color={colors.success.main}
                strokeWidth={2}
              />
            </View>
          )}
        </Animated.View>

        <AppText style={styles.title} variant="h4" weight="semiBold">
          {title}
        </AppText>
        <AppText style={[styles.message, onClose ? styles.messageWithAction : null]} variant="body">
          {message}
        </AppText>

        {showContactSupport && <ContactSupport />}
        {onClose ? (
          <View style={styles.actions}>
            <Button
              variant="primary"
              size="large"
              fullWidth
              onPress={onClose}
              title={closeLabel}
            />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );

  if (renderAsOverlay) {
    if (!visible) return null;
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  overlayFullScreen: {
    flex: 1,
    backgroundColor: colors.transparent,
    justifyContent: 'center',
    alignItems: 'center',
    height: windowHeight * 0.6,
  },
  overlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['4xl'],
    alignItems: 'center',
  },
  containerCentered: {
    backgroundColor: colors.background.primary,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  containerFullScreen: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    backgroundColor: colors.transparent,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconBackground: {
    backgroundColor: colors.success.bg,
    borderRadius: 80,
    padding: spacing.lg,
  },
  image: {
    width: 160,
    height: 100,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  messageWithAction: {
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
    marginTop: spacing.md,
  },
});

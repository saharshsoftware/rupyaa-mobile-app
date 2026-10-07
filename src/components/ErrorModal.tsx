import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { XCircle } from 'lucide-react-native';
import { colors, spacing, radius } from '@/src/theme';
import { ContactSupport } from './ContactSupport';
import { AppText } from './AppText';
import { Button } from './Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { windowHeight } from '@/src/utils/common-helper';
import { IMAGES } from '../constants/images';

export interface ErrorModalProps {
  showContactSupport?: boolean;
  visible: boolean;
  onClose?: () => void;
  /** When provided, shows Retry button. Called when user taps Retry. */
  onRetry?: () => void;
  /** Label for Retry button (default: "Retry") */
  retryLabel?: string;
  title?: string;
  message?: string;
  /** When provided, shows image instead of the error icon */
  imageSource?: ImageSourcePropType;
  /** When true, modal covers full screen (centered content). When false, bottom sheet style. */
  fullScreen?: boolean;
  /** When true, renders as absolute overlay over parent (covers parent only, not full screen). Parent must have flex: 1. */
  renderAsOverlay?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ErrorModal({
  visible,
  showContactSupport = false,
  onClose,
  onRetry,
  retryLabel = 'Retry',
  title = 'Something went wrong',
  message = 'Please try again.',
  imageSource=IMAGES.RETRY,
  fullScreen = false,
  renderAsOverlay = false,
}: ErrorModalProps) {
  const slideAnim = new Animated.Value(SCREEN_HEIGHT);
  const scaleAnim = new Animated.Value(0);
  const insets = useSafeAreaInsets();

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
          delay: fullScreen || renderAsOverlay ? 0 : 200,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      scaleAnim.setValue(0);
    }
  }, [visible, fullScreen, renderAsOverlay]);

  const useOverlayStyle = fullScreen || renderAsOverlay;
  const overlayStyle = useOverlayStyle ? styles.overlayFullScreen : styles.overlay;
  const containerStyle = useOverlayStyle
    ? [
        styles.container,
        styles.containerFullScreen,
        {
          paddingTop: spacing['3xl'] + insets.top,
          paddingBottom: spacing['4xl'] + insets.bottom,
        },
      ]
    : [styles.container, { paddingBottom: spacing.md + insets.bottom }];
  const transformStyle = useOverlayStyle
    ? { transform: [{ scale: scaleAnim }] as const }
    : { transform: [{ translateY: slideAnim }] as const };

  const content = (
    <View style={[overlayStyle, renderAsOverlay && styles.overlayAbsolute]}>
      <Animated.View style={[containerStyle, transformStyle]}>
        <Animated.View
          style={[
            styles.iconContainer,
            !useOverlayStyle && { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {imageSource ? (
            <Image source={imageSource} resizeMode="contain" style={styles.image} />
          ) : (
            <View style={styles.iconBackground}>
              <XCircle
                size={64}
                color={colors.error.main}
                strokeWidth={2}
              />
            </View>
          )}
        </Animated.View>

        <AppText style={styles.title} variant="h4" weight="semiBold">
          {title}
        </AppText>
        <AppText style={styles.message} variant="body">
          {message}
        </AppText>
        {showContactSupport && <ContactSupport />}
        {(onRetry || onClose) && (
          <View style={styles.actions}>
            {onRetry && (
              <Button
                variant="primary"
                size="large"
                fullWidth
                onPress={onRetry}
                title={retryLabel}
              />
            )}
            {onClose && (
              <Button
                variant={onRetry ? 'outline' : 'primary'}
                size="large"
                fullWidth
                onPress={onClose}
                title="Close"
              />
            )}
          </View>
        )}
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
  overlayFullScreen: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  containerFullScreen: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  iconBackground: {
    backgroundColor: colors.error.bg,
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
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
    rowGap: spacing.md,
    marginTop: spacing.md,
  },
});

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '@/src/theme';
import { AppLogo } from './AppLogo';
import { AppText } from './AppText';

const CLOSE_BUTTON_SIZE = 44;

export interface FullScreenModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when close button or Android back is pressed */
  onClose: () => void;
  /** Dynamic content to render below the header */
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional title below header (e.g., "All Products") */
  title?: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Whether to hide the header */
  hideHeader?: boolean;
  /** Whether to show the top-right close button in header */
  showCloseButton?: boolean;
  /** Remove default content paddings for full-bleed content like WebViews */
  disableContentPadding?: boolean;
  /** Optional style override for content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Show a yellow-to-white background behind the modal header area. */
  showTopGradient?: boolean;
}

export function FullScreenModal({
  visible,
  onClose,
  children,
  footer,
  title,
  subtitle,
  hideHeader = false,
  showCloseButton = true,
  disableContentPadding = false,
  contentContainerStyle,
  showTopGradient = false,
}: FullScreenModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {showTopGradient ? (
          <LinearGradient
            pointerEvents="none"
            colors={[
              colors.primary.main,
              'rgba(254, 202, 66, 0.12)',
              'rgba(254, 202, 66, 0.03)',
              colors.background.primary,
            ]}
            locations={[0, 0.18, 0.36, 0.55]}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {/* Header: Logo + Close */}
        {!hideHeader && (
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <AppLogo size="sm" disabled />
            </View>
            {showCloseButton ? (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.7}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <X size={24} color={colors.text.primary} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={styles.closeButtonSpacer} />
            )}
          </View>
        )}
        {/* Optional title and subtitle */}
        {(title ?? subtitle) && (
          <View style={styles.titleSection}>
            {title && (
              <AppText variant="h3" weight="bold" color='textprimary' style={styles.title}>
                {title}
              </AppText>
            )}
            {subtitle && (
              <AppText
                variant="body"
                color="textprimary"
                style={styles.subtitle}
              >
                {subtitle}
              </AppText>
            )}
          </View>
        )}

        {/* Dynamic content */}
        <View
          style={[
            styles.content,
            { paddingBottom: insets.bottom },
            disableContentPadding && styles.contentNoPadding,
            contentContainerStyle,
          ]}
        >
          {children}
          {footer ? (
            <View style={{ paddingBottom: disableContentPadding ? insets.bottom : 0 }}>
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: CLOSE_BUTTON_SIZE,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  closeButtonSpacer: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    marginRight: -spacing.sm,
  },
  titleSection: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.base,
    fontSize: typography.fontSize.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  contentNoPadding: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
});

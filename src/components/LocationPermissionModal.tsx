import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/src/theme';
import { ContactSupport } from './ContactSupport';
import { AppText } from './AppText';
import { Button } from './Button';
import { getByPassSmsPermission } from '@/src/config/resolvedAppConfig';
import { envConfig } from '@/src/config/envConfig';

export interface LocationPermissionModalProps {
  visible: boolean;
  canAskAgain: boolean;
  isProcessing?: boolean;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
}

const ANIMATION_DURATION = 240;
const SLIDE_OFFSET = 32;
const OVERLAY_Z_INDEX = 10000;

export function LocationPermissionModal({
  visible,
  canAskAgain,
  isProcessing = false,
  onRequestPermission,
  onOpenSettings,
}: LocationPermissionModalProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SLIDE_OFFSET)).current;

  const smsRequired = Platform.OS === 'android' && !getByPassSmsPermission();

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
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) {
    return null;
  }

  const primaryLabel = 'Update';
  const handlePrimaryPress = canAskAgain ? onRequestPermission : onOpenSettings;

  const message = Platform.OS === 'android'
    ? smsRequired
      ? 'To continue your loan journey, we need access to your location, camera, calls, and SMS for secure verification and credit assessment.'
      : 'To continue your loan journey, we need access to your location, camera, and calls for secure verification and credit assessment.'
    : 'To continue your loan journey, we need access to your location and camera for secure verification and credit assessment.';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.lg,
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
        <AppText variant="h4" weight="semiBold" style={styles.title}>
          Permissions required
        </AppText>
        <AppText variant="body" style={styles.message}>
          {message}
        </AppText>
        <View style={styles.footer}>
          <ContactSupport />
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={handlePrimaryPress}
            loading={isProcessing}
            disabled={isProcessing}
          >
            {primaryLabel}
          </Button>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: OVERLAY_Z_INDEX,
    elevation: OVERLAY_Z_INDEX,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.background.primary,
    borderRadius: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
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
    marginBottom: spacing.lg,
  },
  footer: {
    width: '100%',
    paddingTop: spacing.md,
  },
});


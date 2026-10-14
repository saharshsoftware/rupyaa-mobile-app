import React from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  View,
  StyleProp,
  TextStyle,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
  textSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export function Button({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  icon,
  title,
  disabled,
  style,
  children,
  textStyle,
  textSize = 'base',
  ...props
}: ButtonProps) {
  const content = title || children;
  const containerStyle = [
    styles.base,
    styles[`${variant}Container`],
    styles[`${size}Container`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textColor = getTextColor(variant);

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} accessibilityLabel="Loading" />
      ) : (
        <View style={styles.content}>
          {(leftIcon || icon) && <View style={styles.leftIcon}>{leftIcon || icon}</View>}
          <AppText
            style={[styles.text, { color: textColor, fontSize: typography.fontSize[textSize] }, textStyle]}
            variant="body"
            weight={variant === 'text' ? 'medium' : 'semiBold'}
          >
            {content}
          </AppText>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

function getTextColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return colors.primary.contrast;
    case 'secondary':
    case 'danger':
      return colors.text.inverse;
    case 'outline':
      return colors.primary.main;
    case 'text':
      return colors.primary.main;
    default:
      return colors.text.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  primaryContainer: {
    backgroundColor: colors.primary.main,
  },
  secondaryContainer: {
    backgroundColor: colors.secondary.main,
  },
  outlineContainer: {
    backgroundColor: colors.transparent,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
  },
  textContainer: {
    backgroundColor: colors.transparent,
  },
  dangerContainer: {
    backgroundColor: colors.error.main,
  },
  smallContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  mediumContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  largeContainer: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing['2xl'],
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

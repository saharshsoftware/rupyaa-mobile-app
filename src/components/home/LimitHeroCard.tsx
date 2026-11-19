import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, ChevronRight, Hourglass, RotateCcw } from 'lucide-react-native';
import { AppText } from '../AppText';
import { colors, radius, spacing } from '@/src/theme';
import { formatCurrency } from '@/src/utils/common-helper';

interface LimitHeroCardProps {
  amount?: number;
  actionLabel: string;
  onActionPress?: () => void;
  disableAction?: boolean;
  hideAction?: boolean;
  caption?: string;
  badgeLabel?: string;
  eyebrow?: string;
  title?: string;
  footerText?: string;
  animatedArrow?: boolean;
  children?: React.ReactNode;
}

const ARROW_COUNT = 4;

function SequentialArrows(): React.JSX.Element {
  const opacities = useRef(
    Array.from({ length: ARROW_COUNT }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        ...opacities.map((opacity) =>
          Animated.timing(opacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          })
        ),
        Animated.delay(350),
        Animated.parallel(
          opacities.map((opacity) =>
            Animated.timing(opacity, {
              toValue: 0.2,
              duration: 160,
              useNativeDriver: true,
            })
          )
        ),
        Animated.delay(200),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacities]);

  return (
    <View style={styles.arrows} accessible={false} pointerEvents="none">
      {opacities.map((opacity, index) => (
        <Animated.View key={index} style={[styles.arrow, { opacity }]}>
          <ChevronRight size={18} color={colors.primary.main} strokeWidth={2.5} />
        </Animated.View>
      ))}
    </View>
  );
}

export function LimitHeroCard({
  amount,
  actionLabel,
  onActionPress,
  disableAction = false,
  hideAction = false,
  caption = 'Fast application. Hassle-free process.',
  badgeLabel,
  eyebrow,
  title,
  footerText,
  animatedArrow = true,
  children,
}: LimitHeroCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const isInteractive = typeof onActionPress === 'function' && !disableAction;
  const isStatusCard = title != null;

  return (
    <LinearGradient colors={['#FEC530', '#FFD76A']} style={styles.card}>
      {badgeLabel ? (
        <View style={styles.badge}>
          <AppText style={styles.badgeText} variant="captionExtraSmall" weight="semiBold">
            {t(badgeLabel).toUpperCase()}
          </AppText>
          <RotateCcw size={14} color={colors.primary.main} strokeWidth={2.5} />
        </View>
      ) : null}
      <AppText style={styles.label} variant="captionSmall" weight="semiBold">
        {eyebrow ?? 'Your Rupyaa Limit'}
      </AppText>
      {isStatusCard ? (
        <AppText style={styles.statusTitle} weight="bold">
          {title}
        </AppText>
      ) : amount != null ? (
        <AppText style={styles.amount} weight="bold">{formatCurrency(amount)}</AppText>
      ) : null}
      <AppText style={styles.caption} variant="captionExtraSmall">
        {caption}
      </AppText>

      {!hideAction ? (
        <TouchableOpacity
          style={[styles.action, !isInteractive && styles.actionDisabled]}
          onPress={onActionPress}
          disabled={!isInteractive}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t(actionLabel)}
        >
          <AppText style={styles.actionText} variant="caption" weight="semiBold">
            {actionLabel}
          </AppText>
          {animatedArrow ? (
            <SequentialArrows />
          ) : (
            <ChevronRight size={22} color={colors.primary.main} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      ) : null}

      <View style={styles.assurance}>
        {footerText ? (
          <Hourglass size={15} color={colors.text.black} strokeWidth={2} />
        ) : (
          <CheckCircle2 size={15} color={colors.text.black} strokeWidth={2} />
        )}
        <AppText style={styles.assuranceText} variant="captionExtraSmall">
          {footerText ?? 'No impact on credit score. No Paperwork.'}
        </AppText>
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.base,
    alignItems: 'center',
    overflow: 'hidden',
  },
  label: {
    color: colors.text.black,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.text.black,
    letterSpacing: 0.4,
  },
  amount: {
    color: colors.text.black,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  statusTitle: {
    color: colors.text.black,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  caption: {
    color: colors.text.black,
    marginBottom: spacing.md,
  },
  action: {
    width: '100%',
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.text.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionDisabled: {
    backgroundColor: colors.border.main,
  },
  actionText: {
    color: colors.primary.main,
  },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  arrow: {
    marginLeft: -spacing.sm,
  },
  assurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  assuranceText: {
    color: colors.text.black,
  },
});

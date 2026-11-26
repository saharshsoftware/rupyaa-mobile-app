import React from 'react';
import { View, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, spacing, radius } from '@/src/theme';

export interface ActionCardProps {
  /** Main heading shown in primary color */
  title: string;
  /** Supporting text shown below the title */
  subtext: string | React.ReactNode;
  /** Called when the card is pressed */
  onPress: () => void;
  /** Accessibility label; defaults to title */
  accessibilityLabel?: string;
  /** Whether the card is part of the bank statement step */
  isBankStatementStep?: boolean;
  /** Emphasize the card (stronger fill + primary border) for preferred actions */
  highlighted?: boolean;
  /** Merged onto the outer card root (e.g. minHeight when aligning with another control). */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Reusable tappable card with title, subtext, and chevron.
 * Use for secondary CTAs (e.g. "Get a Higher Loan Amount") in steps like ApprovedOfferStep or BankConnectStep.
 */
export function ActionCard({
  title,
  subtext,
  onPress,
  isBankStatementStep = false,
  highlighted = false,
  containerStyle,
  accessibilityLabel = title,
}: ActionCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isBankStatementStep && styles.bankStatementStepCard,
        highlighted && styles.highlightedCard,
        containerStyle,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <AppText style={styles.title} variant="caption" color="black" weight="semiBold">
            {title}
          </AppText>
          <AppText style={styles.subtext} variant="captionSmall">
            {subtext}
          </AppText>
        </View>
        <ChevronRight size={20} color={colors.primary.main} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary.lightest_pro,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.lightest,
  },
  bankStatementStepCard: {
    backgroundColor: 'transparent',
  },
  highlightedCard: {
    backgroundColor: colors.primary.lightest,
    borderColor: colors.primary.main,
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtext: {
    color: colors.text.secondary,
    lineHeight: 18,
  },
});
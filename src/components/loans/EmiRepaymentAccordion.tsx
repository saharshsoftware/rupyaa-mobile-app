import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { AppText } from '@/src/components/AppText';
import { colors, radius, spacing } from '@/src/theme';
import type {
  EmiRepaymentAccordionBreakdownRow,
  EmiRepaymentAccordionCardProps,
  EmiRepaymentAccordionItem,
  EmiRepaymentAccordionProps,
} from '@/src/types';

const CARD_LAYOUT = LinearTransition.duration(260);
const BREAKDOWN_ENTERING = FadeInDown.duration(180);
const BREAKDOWN_EXITING = FadeOutUp.duration(120);

function getStatusStyle(item: EmiRepaymentAccordionItem) {
  if (item.statusVariant === 'paid') return styles.statusPaid;
  if (item.statusVariant === 'due') return styles.statusDue;
  if (item.statusVariant === 'overdue') return styles.statusOverdue;
  return null;
}

function BreakdownRow({ label, value, strong = false }: EmiRepaymentAccordionBreakdownRow) {
  return (
    <View style={styles.breakdownRow}>
      <AppText
        style={strong ? styles.breakdownStrong : styles.breakdownLabel}
        variant="caption"
        weight={strong ? 'bold' : 'regular'}
      >
        {label}
      </AppText>
      <AppText
        style={strong ? styles.breakdownStrong : styles.breakdownValue}
        variant="caption"
        weight={strong ? 'bold' : 'semiBold'}
      >
        {value}
      </AppText>
    </View>
  );
}

function EmiRepaymentAccordionCard({
  item,
  isExpanded,
  allowToggle,
  onToggle,
}: EmiRepaymentAccordionCardProps) {
  const statusStyle = getStatusStyle(item);
  const pressDisabled = item.locked === true || !allowToggle;
  const showExpandIndicator = !pressDisabled;
  const breakdownRows = item.breakdownRows.map((row) => (
    <BreakdownRow
      key={`${item.id}-${row.label}`}
      label={row.label}
      value={row.value}
      strong={row.strong}
    />
  ));

  let badgeContent: React.ReactNode;
  if (item.locked === true) {
    badgeContent = <Lock size={16} color={colors.text.secondary} />;
  } else {
    badgeContent = (
      <AppText style={styles.badgeText} variant="caption" weight="bold">
        {item.badgeLabel}
      </AppText>
    );
  }

  let statusPill: React.ReactNode = null;
  if (item.statusLabel) {
    statusPill = (
      <View style={[styles.statusPill, statusStyle]}>
        <AppText style={styles.statusText} variant="captionExtraSmall" weight="bold">
          {item.statusLabel}
        </AppText>
      </View>
    );
  }

  let lockedMessageNode: React.ReactNode = null;
  if (item.locked === true && item.lockedMessage) {
    lockedMessageNode = (
      <View style={styles.lockedRow}>
        <Lock size={12} color={colors.text.secondary} />
        <AppText style={styles.lockedText} variant="captionExtraSmall">
          {item.lockedMessage}
        </AppText>
      </View>
    );
  }

  let expandIndicatorNode: React.ReactNode = null;
  if (showExpandIndicator) {
    expandIndicatorNode = isExpanded ? (
      <ChevronUp size={18} color={colors.primary.main} />
    ) : (
      <ChevronDown size={18} color={colors.text.secondary} />
    );
  }

  let breakdownNode: React.ReactNode = null;
  if (isExpanded) {
    breakdownNode = (
      <Animated.View
        entering={BREAKDOWN_ENTERING}
        exiting={BREAKDOWN_EXITING}
        style={styles.breakdown}
      >
        {breakdownRows}
        <View style={styles.breakdownDivider} />
        <BreakdownRow label={item.totalLabel} value={item.totalValue} strong />
      </Animated.View>
    );
  }

  return (
    <Animated.View layout={CARD_LAYOUT}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: pressDisabled }}
        disabled={pressDisabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.card,
          item.locked === true ? styles.cardLocked : null,
          pressed ? styles.cardPressed : null,
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.badge, item.locked === true ? styles.badgeLocked : null]}>
            {badgeContent}
          </View>
          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <AppText style={styles.title} variant="caption" weight="semiBold">
                {item.title}
              </AppText>
              {statusPill}
            </View>
            <AppText style={styles.dueDate} variant="captionSmall">
              {item.dueLabel}
            </AppText>
            {lockedMessageNode}
          </View>
          <View style={styles.trailing}>
            <AppText style={styles.amount} variant="caption" weight="semiBold">
              {item.amount}
            </AppText>
            {expandIndicatorNode}
          </View>
        </View>
        {breakdownNode}
      </Pressable>
    </Animated.View>
  );
}

export function EmiRepaymentAccordion({
  title,
  items,
  allowToggle = true,
}: EmiRepaymentAccordionProps): React.ReactElement {
  const initialExpandedItems = useMemo(() => {
    return items.reduce<Record<string, boolean>>((acc, item) => {
      if (item.defaultExpanded === true && item.locked !== true) {
        acc[item.id] = true;
      }
      return acc;
    }, {});
  }, [items]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(initialExpandedItems);

  const toggleItem = useCallback((id: string) => {
    setExpandedItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }, []);

  const cards = items.map((item) => (
    <EmiRepaymentAccordionCard
      key={item.id}
      item={item}
      isExpanded={expandedItems[item.id] === true}
      allowToggle={allowToggle}
      onToggle={() => toggleItem(item.id)}
    />
  ));

  let titleNode: React.ReactNode = null;
  if (title) {
    titleNode = (
      <AppText style={styles.sectionTitle} variant="body" weight="semiBold">
        {title}
      </AppText>
    );
  }

  return (
    <View style={styles.section}>
      {titleNode}
      {cards}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.main,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardLocked: {
    backgroundColor: colors.background.secondary,
  },
  cardPressed: {
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    // alignItems: 'center',
    padding: spacing.base,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeLocked: {
    backgroundColor: colors.border.light,
    borderRadius: radius.md,
  },
  badgeText: {
    color: colors.primary.contrast,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text.primary,
  },
  dueDate: {
    color: colors.text.secondary,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  amount: {
    color: colors.text.primary,
  },
  statusPill: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusPaid: {
    backgroundColor: colors.success.main,
  },
  statusDue: {
    backgroundColor: colors.warning.light,
  },
  statusOverdue: {
    backgroundColor: colors.error.overdue,
  },
  statusText: {
    color: colors.primary.contrast,
  },
  breakdown: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: colors.border.light,
    padding: spacing.base,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  breakdownLabel: {
    color: colors.text.secondary,
  },
  breakdownValue: {
    color: colors.text.primary,
  },
  breakdownStrong: {
    color: colors.text.primary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginBottom: spacing.sm,
  },
  lockedRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  lockedText: {
    color: colors.text.secondary,
  },
});

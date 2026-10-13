import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
const COMPACT_BADGE_SIZE = spacing.xl + spacing.xs;

function getDefaultExpandedId(items: EmiRepaymentAccordionItem[]): string | null {
  const defaultItem = items.find((item) => item.defaultExpanded === true && item.locked !== true);
  return defaultItem?.id ?? null;
}

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
  compact,
  showExpandIndicator,
  onToggle,
}: EmiRepaymentAccordionCardProps) {
  const statusStyle = getStatusStyle(item);
  const pressDisabled = item.locked === true || !allowToggle;
  const canShowExpandIndicator = showExpandIndicator && !pressDisabled;
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
      <AppText style={styles.badgeText} variant={compact ? 'captionSmall' : 'caption'} weight="bold">
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
  if (canShowExpandIndicator) {
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
        style={[styles.breakdown, compact ? styles.breakdownCompact : null]}
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
          compact ? styles.cardCompact : null,
          item.locked === true ? styles.cardLocked : null,
          isExpanded ? styles.cardExpanded : null,
          pressed ? styles.cardPressed : null,
        ]}
      >
        <View style={[styles.header, compact ? styles.headerCompact : null]}>
          <View style={[styles.badge, compact ? styles.badgeCompact : null, item.locked === true ? styles.badgeLocked : null]}>
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
  compact = false,
  showExpandIndicator = true,
}: EmiRepaymentAccordionProps): React.ReactElement {
  const defaultExpandedId = useMemo(() => getDefaultExpandedId(items), [items]);
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId);
  const scheduleKey = items.map((item) => `${item.id}:${item.locked === true}`).join('|');

  useEffect(() => {
    setExpandedId((current) => {
      if (current == null) return null;
      const currentItem = items.find((item) => item.id === current);
      if (currentItem != null && currentItem.locked !== true) return current;
      return getDefaultExpandedId(items);
    });
  }, [items, scheduleKey]);

  const toggleItem = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const cards = items.map((item) => {
    const isExpanded = allowToggle
      ? expandedId === item.id && item.locked !== true
      : item.defaultExpanded === true && item.locked !== true;
    return (
      <EmiRepaymentAccordionCard
        key={item.id}
        item={item}
        isExpanded={isExpanded}
        allowToggle={allowToggle}
        compact={compact}
        showExpandIndicator={showExpandIndicator}
        onToggle={() => toggleItem(item.id)}
      />
    );
  });

  let titleNode: React.ReactNode = null;
  if (title) {
    titleNode = (
      <AppText style={[styles.sectionTitle, compact ? styles.sectionTitleCompact : null]} variant="body" weight="semiBold">
        {title}
      </AppText>
    );
  }

  return (
    <View style={[styles.section, compact ? styles.sectionCompact : null]}>
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
  sectionCompact: {
    marginBottom: spacing.sm,
  },
  sectionTitleCompact: {
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardCompact: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  cardLocked: {
    backgroundColor: colors.background.primary,
  },
  cardExpanded: {
    borderColor: colors.primary.main,
  },
  cardPressed: {
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    padding: spacing.base,
  },
  headerCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  badge: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: radius.full,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeCompact: {
    width: COMPACT_BADGE_SIZE,
    height: COMPACT_BADGE_SIZE,
    marginRight: spacing.sm,
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
    backgroundColor: colors.emi.paid,
  },
  statusDue: {
    backgroundColor: colors.emi.due,
  },
  statusOverdue: {
    backgroundColor: colors.error.overdue,
  },
  statusText: {
    color: colors.text.inverse,
  },
  breakdown: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: colors.border.light,
    padding: spacing.base,
  },
  breakdownCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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

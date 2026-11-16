import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileSearch, Pencil, Star } from 'lucide-react-native';
import { AppText, Button, RupyaaLogo } from '@/src/components';
import { CREDIT_SCORE_MAX_ATTEMPTS } from '@/src/config/creditScore';
import { colors, radius, spacing } from '@/src/theme';

interface Props {
  attemptsLeft: number;
  onEditAndRetry: () => void;
  onApplyForLoan: () => void;
}

interface ReasonCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ReasonCard({ icon, title, description }: ReasonCardProps) {
  return (
    <View style={styles.reasonCard}>
      <View style={styles.reasonIcon}>{icon}</View>
      <View style={styles.reasonCopy}>
        <AppText variant="body" weight="semiBold" color="black">
          {title}
        </AppText>
        <AppText variant="caption" color="black" style={styles.reasonDescription}>
          {description}
        </AppText>
      </View>
    </View>
  );
}

function AttemptProgress({ attemptsLeft }: { attemptsLeft: number }) {
  const remaining = Math.max(0, Math.min(CREDIT_SCORE_MAX_ATTEMPTS, attemptsLeft));
  const segments = Array.from({ length: CREDIT_SCORE_MAX_ATTEMPTS }, (_, index) => {
    const filled = index < remaining;
    return (
      <View
        key={`attempt-segment-${index}`}
        style={[styles.segment, filled ? styles.segmentFilled : styles.segmentEmpty]}
      />
    );
  });

  return (
    <View style={styles.progressRow}>
      <View style={styles.segments}>{segments}</View>
      <AppText variant="captionExtraSmall" color="black">
        {`${remaining} of ${CREDIT_SCORE_MAX_ATTEMPTS} attempts left`}
      </AppText>
    </View>
  );
}

export function CreditScoreNotFound({
  attemptsLeft,
  onEditAndRetry,
  onApplyForLoan,
}: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <RupyaaLogo size="sm" style={styles.logo} />

        <View style={styles.heroCircle}>
          <FileSearch size={40} color={colors.text.black} strokeWidth={1.75} />
        </View>

        <AppText variant="h3" weight="bold" color="black" align="center" style={styles.title}>
          {"We couldn't find your credit score"}
        </AppText>
        <AppText variant="body" color="black" align="center" style={styles.subtitle}>
          This usually happens for one of two reasons.
        </AppText>

        <View style={styles.reasons}>
          <ReasonCard
            icon={<Pencil size={18} color={colors.text.black} strokeWidth={2} />}
            title="A detail may not match"
            description="A small typo in your name, PAN or date of birth can stop the check. Edit your details and try again."
          />
          <ReasonCard
            icon={<Star size={18} color={colors.text.black} strokeWidth={2} />}
            title="You may be new to credit"
            description="If you have never had a loan or credit card, you won't have a score yet. You can still apply for a loan."
          />
        </View>

        <Button
          fullWidth
          size="large"
          onPress={onEditAndRetry}
          leftIcon={<Pencil size={18} color={colors.text.black} strokeWidth={2} />}
          style={styles.primaryButton}
        >
          Edit details and retry
        </Button>

        <AttemptProgress attemptsLeft={attemptsLeft} />

        <Pressable
          onPress={onApplyForLoan}
          style={styles.secondaryLink}
          accessibilityRole="link"
          accessibilityLabel="Apply for a loan instead"
        >
          <AppText variant="body" weight="semiBold" color="black" style={styles.underline}>
            Apply for a loan instead
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  logo: {
    marginBottom: spacing.xl,
  },
  heroCircle: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.background.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  reasons: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  reasonDescription: {
    lineHeight: 18,
  },
  primaryButton: {
    marginBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
  },
  segmentFilled: {
    backgroundColor: colors.primary.main,
  },
  segmentEmpty: {
    backgroundColor: colors.border.light,
  },
  secondaryLink: {
    alignSelf: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

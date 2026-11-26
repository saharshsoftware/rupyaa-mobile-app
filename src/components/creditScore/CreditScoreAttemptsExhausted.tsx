import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Headphones, Lock } from 'lucide-react-native';
import { AppText, Button, RupyaaLogo } from '@/src/components';
import { CREDIT_SCORE_MAX_ATTEMPTS } from '@/src/config/creditScore';
import { colors, radius, spacing } from '@/src/theme';

interface Props {
  onTalkToSupport: () => void;
  onApplyForLoan: () => void;
  onBackToHome: () => void;
}

export function CreditScoreAttemptsExhausted({
  onTalkToSupport,
  onApplyForLoan,
  onBackToHome,
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
          <Lock size={36} color={colors.text.black} strokeWidth={1.75} />
        </View>

        <View style={styles.badge}>
          <AppText variant="captionExtraSmall" weight="semiBold" style={styles.badgeText}>
            {`All ${CREDIT_SCORE_MAX_ATTEMPTS} attempts used`}
          </AppText>
        </View>

        <AppText variant="h3" weight="bold" color="black" align="center" style={styles.title}>
          {"We still couldn't find your credit score"}
        </AppText>
        <AppText variant="body" color="black" align="center" style={styles.subtitle}>
          {"Your details may not match the credit bureau's records, or you may be new to credit. Either way, you can still apply for a loan with us."}
        </AppText>

        <Pressable
          onPress={onTalkToSupport}
          style={styles.supportCard}
          accessibilityRole="button"
          accessibilityLabel="Talk to support"
        >
          <View style={styles.supportIcon}>
            <Headphones size={18} color={colors.text.black} strokeWidth={2} />
          </View>
          <View style={styles.supportCopy}>
            <AppText variant="body" weight="semiBold" color="black">
              Talk to support
            </AppText>
            <AppText variant="caption" color="black">
              {"We'll help check your details"}
            </AppText>
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </Pressable>

        <View style={styles.footer}>
          <Button fullWidth size="large" onPress={onApplyForLoan}>
            Apply for a loan
          </Button>
          <Pressable
            onPress={onBackToHome}
            style={styles.secondaryLink}
            accessibilityRole="link"
            accessibilityLabel="Back to home"
          >
            <AppText variant="body" weight="semiBold" color="black" style={styles.underline}>
              Back to home
            </AppText>
          </Pressable>
        </View>
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
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary.opacity40,
    backgroundColor: colors.primary.lightest,
    marginBottom: spacing.lg,
  },
  badgeText: {
    color: colors.warning.dark,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    marginBottom: spacing['2xl'],
  },
  supportIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  footer: {
    marginTop: 'auto',
    gap: spacing.md,
  },
  secondaryLink: {
    alignSelf: 'center',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});

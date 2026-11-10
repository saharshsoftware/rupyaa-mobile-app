import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LimitHeroCard } from './LimitHeroCard';
import { AppText } from '../AppText';
import { colors, radius, spacing } from '@/src/theme';
import { useRejectionRedirect } from '@/src/hooks/useRejectionRedirect';

interface ApplicationNotApprovedCardProps {
  footerMessage: string;
  stripLabel?: string;
  onCreditReportPress?: () => void;
}

export function ApplicationNotApprovedCard({
  footerMessage,
  stripLabel = 'Stay tuned',
  onCreditReportPress,
}: ApplicationNotApprovedCardProps): React.JSX.Element {
  const footerText = footerMessage.replace(/^please\s+/i, '');
  const { redirectUrl, ctaLabel, openPartnerRedirect } = useRejectionRedirect({
    autoRedirect: false,
  });

  return (
    <LimitHeroCard
      actionLabel="Check Credit Report"
      onActionPress={onCreditReportPress}
      badgeLabel={stripLabel}
      eyebrow="Better Loan Options"
      title="COMING SOON..."
      caption="We're working on better loan options for you."
      footerText={footerText}
      animatedArrow={false}
    >
      {redirectUrl ? (
        <View style={styles.partnerCtaWrap}>
          <TouchableOpacity
            style={styles.partnerCta}
            onPress={openPartnerRedirect}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <AppText style={styles.partnerCtaText} variant="caption" weight="semiBold">
              {ctaLabel}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </LimitHeroCard>
  );
}

const styles = StyleSheet.create({
  partnerCtaWrap: {
    width: '100%',
    marginTop: spacing.sm,
  },
  partnerCta: {
    width: '100%',
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.text.black,
    backgroundColor: colors.transparent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  partnerCtaText: {
    color: colors.text.black,
  },
});

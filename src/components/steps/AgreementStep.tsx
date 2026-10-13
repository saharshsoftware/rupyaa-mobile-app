import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { Checkbox } from '../Checkbox';
import { Divider } from '../Divider';
import type { StepProps } from '@/src/types/flow';
import type { AgreementDetails } from '@/src/data/agreement';
import { MOCK_AGREEMENT_DETAILS } from '@/src/data/agreement';
import { IMAGES } from '@/src/constants/images';
import { formatCurrency } from '@/src/utils/common-helper';
import { colors, spacing, radius, typography } from '@/src/theme';

// ─── Internal sub-screen state ────────────────────────────────────
type AgreementScreen = 'summary' | 'consent';

// ─── Consent checkbox keys ────────────────────────────────────────
interface ConsentState {
  readAgreement: boolean;
  termsAndConditions: boolean;
  disbursementConsent: boolean;
}

/**
 * AgreementStep — Two internal sub-screens:
 * 1. Summary: Shows loan KFS details with the agreement illustration
 * 2. Consent: Collect user consent before proceeding to e-Sign
 */
export function AgreementStep({ onNext, onPrev }: StepProps) {
  const [screen, setScreen] = useState<AgreementScreen>('summary');
  const [isSubmitting, setIsSubmitting] = useState(false);


  /** Handle final consent submission before proceeding to e-Sign. */
  const handleConsentSubmit = async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call to record user consent
      await new Promise((resolve) => setTimeout(resolve, 800));
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Navigate back: consent → summary, summary → previous flow step. */
  const handleBack = () => {
    if (screen === 'consent') {
      setScreen('summary');
      return;
    }
    onPrev();
  };

  // ─── Sub-screen: Loan Agreement Summary / KFS ─────────────────
  if (screen === 'summary') {
    return (
      <FormLayout
        safeAreaEdges={['bottom']}
        onBack={onPrev}
        footer={
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={() => setScreen('consent')}
          >
            Review & Accept
          </Button>
        }
      >
        <View style={styles.content}>
          {/* Illustration */}
          <View style={styles.illustrationWrapper}>
            <Image
              source={IMAGES.LOAN_AGREEMENT}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>
          <AppText style={styles.title} variant="body" color="textprimary" weight="semiBold">
            ⏳ Hold on, we&apos;re reviewing your application
          </AppText>
          <AppText style={styles.subtitle} variant="body" color="textprimary">
            We&apos;re checking your details and setting up your Credit Builder Loan. This will only take a few moments.
          </AppText>
          <AppText style={styles.subtitle} variant="body" color="textprimary">
            You’ll be notified once your loan is sanctioned.
          </AppText>    
        </View>
      </FormLayout>
    );
  }

  // ─── Sub-screen: Consent & Accept ─────────────────────────────
  return (
    <FormLayout
      safeAreaEdges={['bottom']}
      onBack={handleBack}
      footer={
        <Button
          variant="primary"
          size="large"
          fullWidth
          // disabled={!allConsentsChecked || isSubmitting}
          loading={isSubmitting}
          onPress={handleConsentSubmit}
        >
          Accept & Proceed to e-Sign
        </Button>
      }
    >
      <View style={styles.content}>
        <AppText style={styles.successTitle} variant="bodyLarge" weight="semiBold">
          Congratulations! Your loan has been sanctioned.
        </AppText>
        <AppText style={styles.subtitle} variant="body">
          Review your Loan Sanction Document before e-Signing the agreement.
        </AppText>
      </View>
    </FormLayout>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.base,
  },

  // ─── Illustration ──────────────────
  illustrationWrapper: {
    alignItems: 'center',
  },
  illustration: {
    width: 250,
    height: 250,
  },

  // ─── Typography ────────────────────
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    lineHeight: 22,
    fontSize: typography.fontSize.xs,
  },
  // ─── Typography ────────────────────
  successTitle: {
    color: colors.success.main,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },

  // ─── Lender info ───────────────────
  lenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lenderText: {
    color: colors.text.tertiary,
  },

  // ─── Download link ─────────────────
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.base,
  },
  downloadText: {
    color: colors.primary.main,
  },

  // ─── Summary mini card (consent screen) ──
  summaryMiniCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.base,
    marginBottom: spacing.xl,
  },
  summaryMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryMiniLabel: {
    color: colors.text.secondary,
  },
  summaryMiniValue: {
    color: colors.text.primary,
  },

  // ─── Consent section ───────────────
  consentSection: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  consentCheckbox: {
    alignItems: 'flex-start',
  },
  consentText: {
    color: colors.text.primary,
    lineHeight: 20,
    flex: 1,
  },
  consentLink: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
  consentHighlight: {
    color: colors.text.primary,
  },

  // ─── Info note ─────────────────────
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info.bg,
    padding: spacing.base,
    borderRadius: radius.lg,
  },
  infoNoteText: {
    color: colors.info.dark,
    lineHeight: 20,
    flex: 1,
  },
});

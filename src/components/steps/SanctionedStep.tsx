import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Linking, Pressable } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { InlineLinkNoticeBox } from '../InlineLinkNoticeBox';
import { LoanCancellationModal } from '../LoanCancellationModal';
import type { StepProps } from '@/src/types/flow';
import { colors, radius, spacing } from '@/src/theme';
import { goHomeWithFallback } from '@/src/services/navigation/homeNavigation';
import { SVG_ILLUSTRATIONS } from '@/src/constants/illustrations';
import { formatCurrency, resolveWhatsAppUrl } from '@/src/utils/common-helper';
import {
  getCanCancelFromActiveLoanResponse,
  getLoanIdFromActiveLoanResponse,
  useGetExistingActiveLoan,
} from '@/src/services/loans';
import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import { isCurrentOfferSuccess } from '@/src/types/offer';

export type SanctionedStepPresentation = 'flow' | 'modal';

export interface SanctionedStepProps extends StepProps {
  /** `modal`: vertically centers body inside scroll area; primary CTA calls `onNext` (host handles dismiss). */
  presentation?: SanctionedStepPresentation;
  isPreEnachReviewGateModal?: boolean;
}

interface LoanSummaryCardProps {
  label: string;
  value: string;
}

function LoanSummaryCard({ label, value }: LoanSummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <AppText variant="captionSmall" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText variant="caption" weight="semiBold" style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

function formatTenure(tenure: string | number | null | undefined): string {
  if (tenure == null || String(tenure).trim().length === 0) return '—';
  const value = String(tenure).trim();
  return /day/i.test(value) ? value : `${value} Days`;
}


export function SanctionedStep({
  onPrev,
  onNext,
  presentation = 'flow',
  isPreEnachReviewGateModal = false,
}: SanctionedStepProps) {
  const router = useRouter();
  const whatsAppUrl = useMemo(() => resolveWhatsAppUrl(), []);
  const isModalPresentation = presentation === 'modal';
  const [isCancellationModalVisible, setCancellationModalVisible] = useState(false);
  const cancellationLoanIdEnabled = !isPreEnachReviewGateModal;
  const { data: activeLoanData } = useGetExistingActiveLoan({
    enabled: cancellationLoanIdEnabled,
  });
  const lastOfferResponse = useCurrentOfferStore((state) => state.lastResponse);
  const currentOffer =
    lastOfferResponse?.success &&
    lastOfferResponse.data != null &&
    isCurrentOfferSuccess(lastOfferResponse.data)
      ? lastOfferResponse.data.offer
      : null;
  const loanAmount = activeLoanData?.loan?.amount ?? currentOffer?.offerAmount;
  const loanTenure = activeLoanData?.loan?.tenure ?? currentOffer?.loanId?.tenure ?? currentOffer?.loanTenure;
  const loanAmountLabel =
    typeof loanAmount === 'number' && Number.isFinite(loanAmount)
      ? formatCurrency(loanAmount)
      : '—';
  const loanTenureLabel = formatTenure(loanTenure);
  const cancellationLoanId = useMemo(
    () => getLoanIdFromActiveLoanResponse(activeLoanData),
    [activeLoanData]
  );
  // Show informational notice whenever we have a loan id; link visibility is
  // gated by `canCancel` from GET /loans/active (fail closed when missing).
  const shouldShowCancellationNotice = cancellationLoanId != null;
  const canCancelLoanNow = getCanCancelFromActiveLoanResponse(activeLoanData);

  const subtitle = useMemo(() => {
    if (isPreEnachReviewGateModal) {
      return 'Verification in progress.✅';
    }
    return 'Your application is under final disbursement review';
  }, [isPreEnachReviewGateModal]);

  const body = useMemo(() => {
    if (isPreEnachReviewGateModal) {
      return 'Once approved, complete the final steps to receive funds in your account within 24 hours.';
    }
    return 'After a successful review, the funds will be transferred to your account within 24 hours.';
  }, [isPreEnachReviewGateModal]);

  const handleComplete = () => {
    goHomeWithFallback(router);
  };

  const handlePrimaryPress = () => {
    if (isModalPresentation) {
      onNext();
      return;
    }
    handleComplete();
  };

  const handleOpenSupportPage = () => {
    router.replace('/support?hideCallToAction=true');
  };

  const handleOpenWhatsApp = () => {
    if (whatsAppUrl) {
      void Linking.openURL(whatsAppUrl).catch(() => undefined);
      return;
    }
    handleOpenSupportPage();
  };

  const handleOpenCancellationModal = () => {
    if (!cancellationLoanId) {
      return;
    }
    setCancellationModalVisible(true);
  };

  const handleCloseCancellationModal = () => {
    setCancellationModalVisible(false);
  };

  return (
    <FormLayout
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      contentContainerStyle={[
        styles.formContent,
        isModalPresentation ? styles.formContentModalCentered : null,
      ]}
      footer={
        <Button variant="primary" size="large" fullWidth onPress={handlePrimaryPress}>
          Go to Home
        </Button>
      }
    >
      <View style={[styles.content, isModalPresentation && styles.contentModal]}>
        <View style={styles.illustration}>
          <SvgXml
            xml={SVG_ILLUSTRATIONS.FINAL_DISBURSEMENT_REVIEW}
            width="100%"
            height="100%"
            accessibilityLabel="Final disbursement review"
          />
        </View>

        <View style={styles.textBlock}>
          <AppText variant="bodyLarge" weight="semiBold" color="textprimary" style={styles.celebration} align="center">
            Great News
          </AppText>

          <AppText style={styles.title} variant="h4" weight="semiBold" align="center">
            {subtitle}
          </AppText>

          <AppText style={styles.body} variant="caption" color="textprimary" align="center">
            {body}
          </AppText>

          <View style={styles.summaryRow}>
            <LoanSummaryCard label="Total Loan Amount" value={loanAmountLabel} />
            <LoanSummaryCard label="Tenure" value={loanTenureLabel} />
          </View>

          {shouldShowCancellationNotice ? (
            <InlineLinkNoticeBox
              title="No longer need the loan?"
              message="You can cancel it yourself after 24 hours directly from the app — no support required."
              linkLabel="Click Here."
              showLink={canCancelLoanNow}
              onLinkPress={handleOpenCancellationModal}
              accessibilityLabel="Open loan cancellation"
              containerStyle={styles.cancellationNotice}
            />
          ) : null}

          <AppText style={[styles.body, styles.bodyBeforeLinks]} variant="caption" color="textprimary" align="center">
            For any questions or assistance, contact our support team.
          </AppText>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open WhatsApp support"
            onPress={handleOpenWhatsApp}
            style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
            hitSlop={8}
          >
            <AppText style={styles.supportLink} variant="caption" weight="medium" color="primary" align="center">
              WhatsApp Support
            </AppText>
          </Pressable>
        </View>
      </View>

      {cancellationLoanId != null ? (
        <LoanCancellationModal
          visible={isCancellationModalVisible}
          loanId={cancellationLoanId}
          onClose={handleCloseCancellationModal}
        />
      ) : null}
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  formContent: {
    paddingHorizontal: spacing.lg,
  },
  /** Vertical center when content is shorter than viewport (e.g. FullScreenModal). */
  formContentModalCentered: {
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  contentModal: {
    paddingTop: 0,
    paddingBottom: spacing.lg,
  },
  illustration: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  textBlock: {
    width: '100%',
    alignSelf: 'stretch',
  },
  celebration: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  body: {
    marginBottom: spacing.lg,
    color: colors.text.gray,
  },
  bodyBeforeLinks: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.base,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: radius.lg,
    backgroundColor: colors.warning['bg-2'],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    color: colors.text.gray,
    textAlign: 'center',
  },
  summaryValue: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  linkRow: {
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: spacing.sm,
    paddingVertical: 2,
  },
  linkRowPressed: {
    opacity: 0.75,
  },
  supportLink: {
    textDecorationLine: 'underline',
  },
  cancellationNotice: {
    borderWidth: 1,
    borderColor: colors.error.light,
  },
});

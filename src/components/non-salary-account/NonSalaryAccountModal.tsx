import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { AppText } from '../AppText';
import { AuthHeader } from '../AuthHeader';
import { Button } from '../Button';
import { FullScreenModal } from '../FullScreenModal';
import { CancellationCalloutBox } from '../loan-cancellation/CancellationCalloutBox';
import { SVG_ILLUSTRATIONS } from '@/src/constants/illustrations';
import { colors, spacing, typography } from '@/src/theme';
import { NonSalaryBenefitsGrid } from './NonSalaryBenefitsGrid';
import { buildRecommendationMessage } from './formatSalarySuffixHint';
import {
  CHANGE_ACCOUNT_LABEL,
  CONTINUE_LABEL,
  MANUAL_REVIEW_CALLOUT_BODY,
  MANUAL_REVIEW_CALLOUT_TITLE,
  MANUAL_REVIEW_LABEL,
  NON_SALARY_ACCOUNT_INTRO_PREFIX,
  NON_SALARY_ACCOUNT_INTRO_SUFFIX,
  NON_SALARY_MODAL_TITLE,
  RECOMMENDATION_CALLOUT_TITLE,
  WHY_USE_SALARY_LABEL,
} from './constants';
import { SectionHeader } from '../home';

const HEADER_ICON_BUTTON_SIZE = 36;
const CALLOUT_ICON_SIZE = 20;
const RECOMMENDATION_ICON_SIZE = 14;
const RECOMMENDATION_ICON_CONTAINER_SIZE = 28;
const ILLUSTRATION_WIDTH = 192;
const ILLUSTRATION_HEIGHT = 94;

export interface NonSalaryAccountModalProps {
  visible: boolean;
  /** Backend salary suffixes (last 4 digits) used to compose the recommendation. */
  salaryAccountSuffixes: string[];
  /** Disables both CTAs and the close handler while the bank submit is in flight. */
  confirmLoading?: boolean;
  onChangeAccount: () => void;
  onContinue: () => void;
  /** Android hardware back. Falls back to onChangeAccount when not loading. */
  onRequestClose?: () => void;
}

/**
 * Full-screen modal shown when the entered bank account does not match the
 * backend salary suffix list. Mirrors the LoanCancellationShell pattern
 * (FullScreenModal + custom header + scrollable body + sticky footer) and
 * leaves submission control to the parent so Continue can re-trigger the
 * existing bank-details mutation without duplicating retry plumbing here.
 */
export function NonSalaryAccountModal({
  visible,
  salaryAccountSuffixes,
  confirmLoading = false,
  onChangeAccount,
  onContinue,
  onRequestClose,
}: NonSalaryAccountModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing.md);

  const recommendationMessage = buildRecommendationMessage(salaryAccountSuffixes);

  const handleClose = useCallback(() => {
    // Block hardware/back close while submitting so we don't leave the bank
    // mutation in flight without surface for the user to react to.
    if (confirmLoading) return;
    if (onRequestClose) {
      onRequestClose();
      return;
    }
    onChangeAccount();
  }, [confirmLoading, onChangeAccount, onRequestClose]);

  const handleChangeAccountPress = () => {
    if (confirmLoading) return;
    onChangeAccount();
  };

  const handleContinuePress = () => {
    if (confirmLoading) return;
    onContinue();
  };



  return (
    <FullScreenModal
      visible={visible}
      onClose={handleClose}
      hideHeader
      showCloseButton={false}
      disableContentPadding
      contentContainerStyle={styles.modalContent}
    >
      <View style={styles.layout}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            colors.primary.main,
            colors.primary.lightest_3,
            colors.background.primary,
          ]}
          locations={[0, 0.12, 0.28]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerWrap}>
          <AuthHeader disableLogoPress />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText
            variant="h4"
            weight="semiBold"
            color="textprimary"
            align="center"
            style={styles.title}
          >
            {NON_SALARY_MODAL_TITLE}
          </AppText>

          <View style={styles.illustrationWrap}>
            <View style={styles.illustrationFrame}>
              <SvgXml
                xml={SVG_ILLUSTRATIONS.NON_SALARY_ACCOUNT}
                width="100%"
                height="100%"
                accessibilityLabel="Non-salary account warning"
              />
            </View>
          </View>

          <AppText
            variant="caption"
            color="textprimary"
            align="center"
            style={styles.intro}
          >
            {t(NON_SALARY_ACCOUNT_INTRO_PREFIX)}
            <AppText variant="caption" color="primary">
              {MANUAL_REVIEW_LABEL}
            </AppText>
            {t(NON_SALARY_ACCOUNT_INTRO_SUFFIX)}
          </AppText>

          <View style={styles.calloutStack}>
            <CancellationCalloutBox
              variant="outline"
              title={RECOMMENDATION_CALLOUT_TITLE}
              descriptionAlign="title"
              style={styles.recommendationCallout}
              icon={
                <View style={styles.starIconWrap}>
                  <Star
                    size={RECOMMENDATION_ICON_SIZE}
                    color={colors.text.black}
                    fill={colors.text.black}
                    strokeWidth={1.8}
                  />
                </View>
              }
            >
              {recommendationMessage}
            </CancellationCalloutBox>
            <CancellationCalloutBox
              title={MANUAL_REVIEW_CALLOUT_TITLE}
              descriptionAlign="title"
              icon={
                <View style={styles.manualReviewIconWrap}>
                  <Clock
                    size={CALLOUT_ICON_SIZE}
                    color={colors.text.primary}
                    strokeWidth={1.8}
                  />
                </View>
              }
            >
              {MANUAL_REVIEW_CALLOUT_BODY}
            </CancellationCalloutBox>

          </View>

          <SectionHeader title={WHY_USE_SALARY_LABEL} />
          <View style={styles.whyUseSalaryContainer}>
            <NonSalaryBenefitsGrid />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: bottomInset + spacing.sm }]}>
          <Button
            variant="primary"
            size="medium"
            fullWidth
            onPress={handleChangeAccountPress}
            disabled={confirmLoading}
          >
            {CHANGE_ACCOUNT_LABEL}
          </Button>
          <Button
            variant="outline"
            size="medium"
            fullWidth
            onPress={handleContinuePress}
            loading={confirmLoading}
            disabled={confirmLoading}
          >
            {CONTINUE_LABEL}
          </Button>
        </View>
      </View>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  layout: {
    flex: 1,
    minHeight: 0,
  },
  headerWrap: {
    paddingHorizontal: spacing.base,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionButton: {
    width: HEADER_ICON_BUTTON_SIZE,
    height: HEADER_ICON_BUTTON_SIZE,
    borderRadius: HEADER_ICON_BUTTON_SIZE / 2,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    lineHeight: 36,
    marginBottom: spacing.base,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  illustrationFrame: {
    width: ILLUSTRATION_WIDTH,
    height: ILLUSTRATION_HEIGHT,
  },
  intro: {
    marginBottom: spacing.lg,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  calloutStack: {
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  recommendationCallout: {
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: colors.warning['bg-2'],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  dividerLabel: {
    color: colors.text.secondary,
  },
  footer: {
    padding: spacing.base,
    gap: spacing.md,
    backgroundColor: colors.background.primary,
  },
  whyUseSalaryContainer: {
    backgroundColor: colors.warning['bg-2'],
    padding: spacing.md,
    borderRadius: spacing.md,
  },
  starIconWrap: {
    width: RECOMMENDATION_ICON_CONTAINER_SIZE,
    height: RECOMMENDATION_ICON_CONTAINER_SIZE,
    borderRadius: RECOMMENDATION_ICON_CONTAINER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  manualReviewIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.lightest,
  },
});

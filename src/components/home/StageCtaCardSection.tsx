/**
 * StageCtaCardSection - Single place for PreOfferCard / PostOfferCard with
 * ProgressStepperV2 above CTA. Stepper can be hidden per stage via config.
 * Does not replace LoanStatusCard; use this when you want the stepper-above-CTA layout.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '@/src/theme';
import { AppText } from '../AppText';
import { PreOfferCard } from './PreOfferCard';
import { PostOfferCard } from './PostOfferCard';
import { ActiveLoanCard } from './ActiveLoanCard';
import { EmiHomePlanCard } from './EmiHomePlanCard';
import { UnderReviewCard } from './UnderReviewCard';
import { ProgressStepperV2 } from '../ProgressStepper';
import { getLoanStatusCardStageConfig } from '@/src/config/loanStatusCardConfig';
import { UserStagesInBackend } from '@/src/config/userStages';
import { USER_STAGE_GROUPS } from '@/src/config/userStages';
import { isCblOrRejectedStage } from '@/src/config/userStages';
import { getMainStepLabels, type FlowPhase } from '@/src/config/flowSteps';
import type { FlowJourneySummary } from '@/src/utils/flowProgress';
import { isEmiLoan, isLoanStatusPending } from '@/src/utils/loan-helpers';
import type { Loan } from '@/src/types';
import { IMAGES } from '@/src/constants/images';
import { ApplicationNotApprovedCard } from './ApplicationNotApprovedCard';

/** Pre-offer = register phase only (stages before OFFERINGS). */
const PRE_OFFER_STAGES: readonly UserStagesInBackend[] = USER_STAGE_GROUPS.register;

function isPreOfferStage(stage: UserStagesInBackend | undefined): boolean {
  if (!stage) return false;
  return (PRE_OFFER_STAGES as readonly string[]).includes(stage);
}

export interface StageCtaCardSectionProps {
  /** Used to pick PreOfferCard vs PostOfferCard and hideProgressStepper from config */
  userStage: UserStagesInBackend | undefined;
  status: 'in_progress' | 'completed';
  title?: string;
  heading: string;
  description: string;
  journey?: FlowJourneySummary;
  passedPhases?: Record<FlowPhase, boolean>;
  passedSubsteps?: Record<string, boolean>;
  actionLabel: string;
  onActionPress?: () => void;
  disableAction?: boolean;
  titleBadgeVariant?: 'warning';
  hideAction?: boolean;
  /** When true, hides only the progress stepper; CTA remains. From stage config. */
  hideProgressStepper?: boolean;
  actionMessage?: string;
  illustrationSource?: React.ComponentProps<typeof PreOfferCard>['illustrationSource'];
  statusPill?: string;
  stripLabel?: string;
  /** When 'overdue', pill uses error styling for ACTIVE_LOAN_DASHBOARD. */
  statusPillVariant?: 'active' | 'overdue';
  applicationNumber?: string;
  amount?: number;
  /** PostOfferCard only: tenure label (e.g. "90 Days") */
  tenure?: string;
  /** PostOfferCard only: total payable amount */
  totalPayable?: number;
  /** Active EMI dashboard card. Payday loans keep ActiveLoanCard. */
  loan?: Loan | null;
  /** ActiveLoanCard only: amount due for repayment */
  amountDue?: number;
  /** ActiveLoanCard only: due date string */
  dueDate?: string;
  /** When 'Rejected', PostOfferCard hides amount and total payable. */
  loanStatus?: string;
  /** Under-review card only: fetch latest active loan/application state */
  onRefreshPress?: () => void;
  /** Refresh state for post-offer/under-review cards */
  isRefreshing?: boolean;
  /** ActiveLoanCard only: show cancellation entry below Pay Now */
  showCancelLoanEntry?: boolean;
  /** ActiveLoanCard only: enable "Cancel loan" link when cancel-eligibility allows */
  canCancelLoan?: boolean;
  onCancelLoanPress?: () => void;
  /** Rejected card only: existing credit-report navigation action. */
  onRejectedCreditReportPress?: () => void;
  /** PreOfferCard only: backend still resolving stage (retryStage) — show loader instead of CTA */
  isCheckingEligibility?: boolean;
}

/**
 * Renders PreOfferCard or PostOfferCard with ProgressStepperV2 just above the CTA.
 * Stepper is hidden when hideProgressStepper is true for the current stage (from config).
 */
export function StageCtaCardSection({
  userStage,
  status,
  title,
  heading,
  description,
  journey,
  passedPhases,
  passedSubsteps,
  actionLabel,
  onActionPress,
  disableAction = false,
  titleBadgeVariant,
  hideAction = false,
  hideProgressStepper: hideProgressStepperProp,
  actionMessage,
  illustrationSource,
  statusPill,
  stripLabel,
  statusPillVariant,
  applicationNumber,
  amount,
  loan = null,
  tenure,
  totalPayable,
  amountDue,
  dueDate,
  loanStatus,
  onRefreshPress,
  isRefreshing = false,
  showCancelLoanEntry = false,
  canCancelLoan = false,
  onCancelLoanPress,
  onRejectedCreditReportPress,
  isCheckingEligibility = false,
}: StageCtaCardSectionProps) {
  const config = userStage != null ? getLoanStatusCardStageConfig(userStage) : null;
  const hideProgressStepper = hideProgressStepperProp ?? config?.hideProgressStepper ?? false;
  const showStepper = !hideAction && !hideProgressStepper && !statusPill;
  const isCompleted = status === 'completed';
  const isInteractive =
    typeof onActionPress === 'function' && !isCompleted && !disableAction && !isCheckingEligibility;

  const currentStep = journey?.phaseIndex ?? 0;
  const progressInStep = journey
    ? journey.totalSubsteps > 1
      ? journey.substepIndex / (journey.totalSubsteps - 1)
      : 1
    : 0;
  const currentSubstepIndex = journey?.substepIndex ?? 0;

  const isPreOffer = isPreOfferStage(userStage);
  const isActiveLoanDashboard = userStage === UserStagesInBackend.ACTIVE_LOAN_DASHBOARD;
  /** Same card as APPLICATION_STATUS when API reports pending (e.g. stage not yet synced). */
  const showUnderReviewCard =
    userStage === UserStagesInBackend.APPLICATION_STATUS || isLoanStatusPending(loanStatus);
  const showCblRejectedCard = isCblOrRejectedStage(userStage);

  const stepperAndMessage = (
    <>
      {showStepper && (
        <View style={styles.stepperWrap}>
          <ProgressStepperV2
            steps={getMainStepLabels()}
            currentStep={currentStep}
            progress={progressInStep}
            passedPhases={passedPhases}
            passedSubsteps={passedSubsteps}
            currentSubstepIndex={currentSubstepIndex}
            numberOfLines={2}
          />
        </View>
      )}
      {actionMessage != null && actionMessage.length > 0 && (
        <AppText
          variant="caption"
          style={[
            styles.actionMessage,
            !showStepper && styles.actionMessageNoStepper,
          ]}
        >
          {actionMessage}
        </AppText>
      )}
    </>
  );

  if (isActiveLoanDashboard && loan != null && isEmiLoan(loan)) {
    return <EmiHomePlanCard loan={loan} onPayPress={onActionPress} disabled={disableAction} />;
  }

  // dueAmount API field is not yet live — amountDue is optional; card handles the fallback internally
  if (isActiveLoanDashboard && amount != null && dueDate && statusPill) {
    return (
      <ActiveLoanCard
        amount={amount}
        amountDue={amountDue}
        dueDate={dueDate}
        statusPill={statusPill as 'Active' | 'Overdue'}
        actionLabel={actionLabel}
        onActionPress={onActionPress}
        disableAction={disableAction}
        showCancelLoanEntry={showCancelLoanEntry}
        canCancelLoan={canCancelLoan}
        onCancelLoanPress={onCancelLoanPress}
      />
    );
  }

  // Shows PreOfferCard when the user stage is in the pre-offer stages
  if (isPreOffer) {
    const cardContent = {
      // title:,
      // heading,
      description,
      // amount,
      illustrationSource: IMAGES.THUNDER,
      statusPill: statusPill ?? 'Pre-Approved',
      titleBadgeVariant,
    };
    return (
      <PreOfferCard {...cardContent} isCheckingEligibility={isCheckingEligibility}>
        {stepperAndMessage}
        {!hideAction && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              !isInteractive && styles.actionButtonDisabled,
              !showStepper && styles.actionButtonNoStepper,
            ]}
            onPress={onActionPress}
            disabled={!isInteractive}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <AppText variant="body" weight="medium" style={styles.actionButtonText}>
              {actionLabel}
            </AppText>
          </TouchableOpacity>
        )}
      </PreOfferCard>
    );
  }

  // Shows UnderReviewCard when the user stage is APPLICATION_STATUS and the loan status is pending
  if (showUnderReviewCard) {
    return (
      <UnderReviewCard
        applicationNumber={applicationNumber}
        heading={heading}
        message={description}
        onRefreshPress={onRefreshPress}
        isRefreshing={isRefreshing}
      />
    );
  }

  // Shows ApplicationNotApprovedCard when showCblRejectedCard is true when the user is in a CBL or rejected stage and the loan status is rejected
  if (showCblRejectedCard) {
    return (
      <ApplicationNotApprovedCard
        footerMessage={actionMessage ?? ''}
        stripLabel={stripLabel}
        onCreditReportPress={onRejectedCreditReportPress}
      />
    );
  }

  // Shows PostOfferCard when showPostOfferCard is true when the user is in a post-offer stage
  return (
    <PostOfferCard
      applicationNumber={applicationNumber}
      amount={amount}
      tenure={tenure}
      totalPayable={totalPayable}
      actionLabel={actionLabel}
      onActionPress={onActionPress}
      onRefreshPress={onRefreshPress}
      isRefreshing={isRefreshing}
      disableAction={disableAction}
      hideAction={hideAction}
      iconSource={IMAGES.RUPEE}
      statusPill={statusPill}
      statusPillVariant={statusPillVariant}
      loanStatus={loanStatus}
      showCancelLoanEntry={showCancelLoanEntry}
      canCancelLoan={canCancelLoan}
      onCancelLoanPress={onCancelLoanPress}
    >
      {stepperAndMessage}
    </PostOfferCard>
  );
}

const styles = StyleSheet.create({
  stepperWrap: {
    marginBottom: -spacing.md,
  },
  actionMessage: {
    marginTop: spacing.sm,
    marginBottom: spacing.base,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionMessageNoStepper: {
    marginTop: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonNoStepper: {
    marginTop: spacing.lg,
  },
  actionButtonDisabled: {
    backgroundColor: colors.border.main,
  },
  actionButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.base,
  },
});

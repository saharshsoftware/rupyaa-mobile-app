import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  FullScreenModal,
  ContactSupport,
  LoanStatusCardSkeleton,
  StageCtaCardSection,
  ProductsGrid,
  LoanCancellationModal,
  ApplyForLoanHomeView,
} from '@/src/components';
import type { LoanStatusCardSectionProps } from '@/src/components/home/LoanStatusCardSection';
import { getLoanStatusCardStageConfig, DEFAULT_HEADING, DEFAULT_HEADING_WITHOUT_AMOUNT } from '@/src/config/loanStatusCardConfig';
import {
  isCblOrRejectedStage,
  USER_STAGE_GROUPS,
  UserStagesInBackend,
} from '@/src/config/userStages';
import {
  getCanCancelFromActiveLoanResponse,
  getLoanIdFromActiveLoanResponse,
  useGetExistingActiveLoan,
} from '@/src/services/loans';
import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import {
  buildActiveLoanCardContent,
  getAmountDue,
  isLoanStatusPending,
  resolveActiveLoanScreenType,
  resolveActiveLoanStatusPill,
  resolveCardDisplayAmount,
  statusPillToVariant,
} from '@/src/utils/loan-helpers';
import { useFlowStore } from '@/src/store';
import { getApplicationNumberFromCurrentOffer, getOfferAmount, isCurrentOfferSuccess } from '@/src/types/offer';
import { consoleLogDev, formatCurrency } from '@/src/utils/common-helper';
import { colors, spacing } from '@/src/theme';
import { getFlowJourneySummary } from '@/src/utils/flowProgress';
import { useUserStage } from '@/src/hooks/useUserStage';
import { ActiveLoanDevToolbar } from '@/src/components/home/ActiveLoanDevToolbar';
import { useActiveLoanDevStore } from '@/src/store/useActiveLoanDevStore';
import { appConfig } from '@/src/config/appConfig';
import { useAuthStore, selectIsAuthenticated } from '@/src/store/useAuthStore';
import { useLoanJourneyGuard } from '@/hooks/useLoanJourneyGuard';
import { DEFAULT_ACTIVE_LOAN_AMOUNT } from '@/src/constants/data';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

export default function HomeTab() {
  const tabBarHeight = useBottomTabBarHeight();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  // Fetch and sync user stage from backend when logged in.
  const userStageQuery = useUserStage(isAuthenticated);
  const isUserStageLoading =
    userStageQuery.isPending ||
    (userStageQuery.isFetching && userStageQuery.data == null);
  // Backend still resolving the stage (retryStage) — show a checking-eligibility loader in PreOfferCard.
  const isCheckingEligibility = userStageQuery.data?.retryStage === true;

  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [isRefreshingLoanStatus, setIsRefreshingLoanStatus] = useState(false);
  const [isCancellationModalVisible, setCancellationModalVisible] = useState(false);
  const phaseIndex = useFlowStore((s) => s.phaseIndex);
  const substepIndex = useFlowStore((s) => s.substepIndex);
  const applicationCompleted = useFlowStore((s) => s.applicationCompleted);
  const userStage = useFlowStore((s) => s.userStage);
  const isActiveLoanDashboard = userStage === UserStagesInBackend.ACTIVE_LOAN_DASHBOARD;
  const activeLoanTestVariant = useActiveLoanDevStore((s) => s.testVariant);

  // Fetch existing active loan only for authenticated users.
  const activeLoanQuery = useGetExistingActiveLoan({ enabled: isAuthenticated });

  const cancellationLoanId = useMemo(
    () => getLoanIdFromActiveLoanResponse(activeLoanQuery.data),
    [activeLoanQuery.data]
  );
  const canCancelLoan = getCanCancelFromActiveLoanResponse(activeLoanQuery.data);

  useEffect(() => {
    if (!isAuthenticated || activeLoanQuery.data == null) {
      return;
    }
    consoleLogDev('[HomeTab] loan cancellation state', {
      userStage,
      hasActiveLoan: activeLoanQuery.data.hasActiveLoan,
      loanStatus: activeLoanQuery.data.loanStatus,
      canCancelRaw: activeLoanQuery.data.canCancel,
      canCancelParsed: canCancelLoan,
      cancellationLoanId,
      showCancelLoanEntry: cancellationLoanId != null,
    });
  }, [
    activeLoanQuery.data,
    canCancelLoan,
    cancellationLoanId,
    isAuthenticated,
    userStage,
  ]);

  const offerStoreResponse = useCurrentOfferStore((s) => s.lastResponse);
  const passedPhases = useFlowStore((s) => s.passedPhases);
  const passedSubsteps = useFlowStore((s) => s.passedSubsteps);

  // Re-fetch user stage and active loan every time this tab comes into focus (e.g. after returning
  // from loan journey or permissions screen). Tab screens stay mounted, so
  // refetchOnMount alone won't fire on re-navigation.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      void userStageQuery.refetch();
      void activeLoanQuery.refetch();
    }, [activeLoanQuery.refetch, isAuthenticated, userStageQuery.refetch])
  );

  const journeySummary = useMemo(
    () => getFlowJourneySummary(phaseIndex, substepIndex),
    [phaseIndex, substepIndex]
  );
  const journeyStatus = applicationCompleted ? 'completed' : 'in_progress';
  const { tryOpenLoanJourney } = useLoanJourneyGuard();

  const handleResumeJourney = () => {
    if (applicationCompleted) return;
    tryOpenLoanJourney(() => router.push('/loan-journey'));
  };

  const handleCheckEligibility = () => {
    tryOpenLoanJourney(() => router.push('/loan-journey'));
  };

  const handleProductPressFromModal = (productId: string) => {
    setProductsModalVisible(false);
    router.push(`/products/${productId}`);
  };

  const handleCreditReportPress = () => {
    router.push('/credit-score');
  };

  const handleForecloseFromHome = () => {
    router.push('/offercard/foreclosuer');
  };

  /** Navigate to Payment or Foreclosure screen based on active loan; fallback to My Loan tab. */
  const handlePaymentFromHome = useCallback(() => {
    const loan = activeLoanQuery.data?.loan ?? null;
    // debugger;
    const screenType = resolveActiveLoanScreenType(loan);
    // const screenType = 'payment';
    if (screenType === 'payment' || screenType === 'payment-emi') {
      router.push('/payment');
    } else if (screenType === 'foreclosure') {
      router.push('/offercard/foreclosuer');
    } else {
      router.replace('/(tabs)/my-loan');
    }
  }, [activeLoanQuery.data?.loan]);

  const handleTrackStatus = useCallback(() => {
    tryOpenLoanJourney(() => router.push('/loan-journey'));
  }, [tryOpenLoanJourney]);

  const handleOpenCancellationModal = useCallback(() => {
    if (!cancellationLoanId) {
      return;
    }
    setCancellationModalVisible(true);
  }, [cancellationLoanId]);

  const handleCloseCancellationModal = useCallback(() => {
    setCancellationModalVisible(false);
  }, []);

  const handleLoanCancelled = useCallback(() => {
    void activeLoanQuery.refetch();
    void userStageQuery.refetch();
  }, [activeLoanQuery.refetch, userStageQuery.refetch]);

  /** Refresh under-review card: active loan + user stage so UI matches backend after review. */
  const handleUnderReviewRefresh = useCallback(() => {
    if (isRefreshingLoanStatus) return;
    setIsRefreshingLoanStatus(true);
    void Promise.all([activeLoanQuery.refetch(), userStageQuery.refetch()]).finally(() => {
      setIsRefreshingLoanStatus(false);
    });
  }, [activeLoanQuery.refetch, userStageQuery.refetch, isRefreshingLoanStatus]);

  /** Maps user stage to the correct onActionPress callback. */
  function resolveActionHandler(
    stage: UserStagesInBackend | undefined,
    handlers: {
      resumeJourney: () => void;
      goToLoanAction: () => void;
      trackStatus: () => void;
    }
  ): (() => void) | undefined {
    if (!stage) return handlers.resumeJourney;
    if (stage === UserStagesInBackend.ACTIVE_LOAN_DASHBOARD) return handlers.goToLoanAction;
    if (stage === UserStagesInBackend.APPLICATION_STATUS) return handlers.trackStatus;
    if (isCblOrRejectedStage(stage)) return undefined;
    if (applicationCompleted) return undefined;
    return handlers.resumeJourney;
  }

  /** Builds full LoanStatusCardSection props from stage config and flow state. */
  function buildLoanStatusCardProps(): LoanStatusCardSectionProps {
    const config = getLoanStatusCardStageConfig(userStage as UserStagesInBackend);
    // Prefer get-existing-active-loan (loan.applicationNumber); fallback to current-offer (offer.loanId)
    // so application ID shows when user lands on home after BSA/bureau before active loan refetch.
    const fromActiveLoan =
      typeof activeLoanQuery.data?.loan?.applicationNumber === 'string'
        ? activeLoanQuery.data.loan.applicationNumber.trim()
        : '';
    const fromCurrentOffer = getApplicationNumberFromCurrentOffer(offerStoreResponse) ?? '';
    const loanApplicationNumber = fromActiveLoan.length > 0 ? fromActiveLoan : fromCurrentOffer;
    const onAction = resolveActionHandler(userStage, {
      resumeJourney: handleResumeJourney,
      goToLoanAction: handlePaymentFromHome,
      trackStatus: handleTrackStatus,
    });
    const shouldDisableAction = isCblOrRejectedStage(userStage);
    let heading = config?.heading ?? '';
    let description = config?.description ?? '';
    let statusPill = config?.statusPill;
    let statusPillVariant: 'active' | 'overdue' | undefined;

    if (userStage === UserStagesInBackend.ACTIVE_LOAN_DASHBOARD) {
      const loan = activeLoanQuery.data?.loan ?? null;
      const activeContent = buildActiveLoanCardContent(loan);
      heading = activeContent.heading;
      description = activeContent.description;
      const resolvedPill = resolveActiveLoanStatusPill(loan, activeLoanTestVariant);
      statusPill = resolvedPill;
      // statusPill = 'Overdue';
      statusPillVariant = statusPillToVariant(resolvedPill);
    }

    const offerAmount = getOfferAmount(offerStoreResponse);
    if (userStage === UserStagesInBackend.OFFERINGS && offerAmount != null) {
      heading = `You're Eligible for ${formatCurrency(offerAmount)}`;
    }

    const loanAmount = activeLoanQuery.data?.loan?.amount;
    const useDevMock = Boolean(activeLoanTestVariant && userStage === UserStagesInBackend.ACTIVE_LOAN_DASHBOARD);
    const amount = resolveCardDisplayAmount(loanAmount, offerAmount ?? undefined, {
      useDevMockForActiveLoan: useDevMock,
    });
    // When we show amount in the card, don't use the default heading that contains ₹5,00,000
    if (amount != null && heading === DEFAULT_HEADING) {
      heading = DEFAULT_HEADING_WITHOUT_AMOUNT;
    }

    // Pending loan (under review): UnderReviewCard copy matches APPLICATION_STATUS stage
    if (isLoanStatusPending(activeLoanQuery.data?.loanStatus)) {
      const reviewCfg = getLoanStatusCardStageConfig(UserStagesInBackend.APPLICATION_STATUS);
      heading = reviewCfg.heading;
      description = reviewCfg.description;
    }

    return {
      status: journeyStatus,
      title: config?.title,
      heading,
      description,
      amount,
      actionLabel: config?.actionLabel,
      onActionPress: onAction,
      disableAction: config?.disableAction ?? shouldDisableAction,
      titleBadgeVariant: config?.titleBadgeVariant,
      hideAction: config?.hideAction,
      hideProgressStepper: config?.hideProgressStepper,
      actionMessage: config?.actionMessage,
      illustrationSource: config?.illustrationSource,
      statusPill,
      stripLabel: config?.stripLabel,
      statusPillVariant,
      applicationNumber: loanApplicationNumber.length > 0 ? loanApplicationNumber : undefined,
      journey: applicationCompleted ? undefined : journeySummary,
      passedPhases,
      passedSubsteps,
      onRefreshPress: handleUnderReviewRefresh,
      isRefreshing: isRefreshingLoanStatus,
      isCheckingEligibility,
    };
  }

  /** AmountDue and dueDate for ActiveLoanCard (ACTIVE_LOAN_DASHBOARD). Dev override for testing. */
  const activeLoanAmountDue = useMemo(() => {
    if (activeLoanTestVariant) {
      return 5400; // Mock amount due for dev testing
    }
    const loan = activeLoanQuery.data?.loan;
    if (!loan) return undefined;
    const amt = getAmountDue(loan);
    consoleLogDev('activeLoanAmountDue', amt);
    return Number.isFinite(amt) ? amt : undefined;
  }, [activeLoanQuery.data?.loan, activeLoanTestVariant]);

  const activeLoanDueDate = useMemo(() => {
    if (activeLoanTestVariant) {
      const d = new Date();
      if (activeLoanTestVariant === 'active') {
        d.setDate(d.getDate() + 15);
      } else {
        d.setDate(d.getDate() - 5);
      }
      return d.toISOString().slice(0, 10);
    }
    const loan = activeLoanQuery.data?.loan;
    return loan?.dueDate && typeof loan.dueDate === 'string' ? loan.dueDate : undefined;
  }, [activeLoanQuery.data?.loan, activeLoanTestVariant]);

  /** Tenure and totalPayable for PostOfferCard from offer or active loan. */
  const postOfferTenure = useMemo(() => {
    const loan = activeLoanQuery.data?.loan;
    if (loan?.tenure != null && String(loan.tenure).trim().length > 0) {
      return String(loan.tenure).trim();
    }
    if (offerStoreResponse?.success && offerStoreResponse?.data && isCurrentOfferSuccess(offerStoreResponse.data)) {
      const days = offerStoreResponse.data.offer.loanTenure;
      if (typeof days === 'number' && Number.isFinite(days)) {
        return `${days} Days`;
      }
    }
    return undefined;
  }, [activeLoanQuery.data?.loan, offerStoreResponse]);

  const postOfferTotalPayable = useMemo(() => {
    const loan = activeLoanQuery.data?.loan;
    if (loan?.totalPayable != null && typeof loan.totalPayable === 'number') {
      return loan.totalPayable;
    }
    if (offerStoreResponse?.success && offerStoreResponse?.data && isCurrentOfferSuccess(offerStoreResponse.data)) {
      const payable = offerStoreResponse.data.offer.payableAmount;
      if (typeof payable === 'number' && Number.isFinite(payable)) {
        return payable;
      }
    }
    return undefined;
  }, [activeLoanQuery.data?.loan, offerStoreResponse]);

  /** Renders loan status section: skeleton while loading, StageCtaCardSection (Pre/Post card + stepper + CTA) when ready. */
  function renderLoanStatusSection(): React.ReactNode {
    if (isUserStageLoading) return <LoanStatusCardSkeleton />;
    return (
      <>
        {isActiveLoanDashboard && appConfig.showActiveLoanDevToolbar && (
          <ActiveLoanDevToolbar visible={isActiveLoanDashboard} />
        )}
        <StageCtaCardSection
          userStage={userStage as UserStagesInBackend}
          {...buildLoanStatusCardProps()}
          loan={activeLoanQuery.data?.loan ?? null}
          tenure={postOfferTenure}
          totalPayable={postOfferTotalPayable}
          amountDue={activeLoanAmountDue}
          dueDate={activeLoanDueDate}
          loanStatus={activeLoanQuery.data?.loanStatus}
          showCancelLoanEntry={cancellationLoanId != null}
          canCancelLoan={canCancelLoan}
          onCancelLoanPress={handleOpenCancellationModal}
          onRejectedCreditReportPress={handleCreditReportPress}
        />
      </>
    );
  }

  const resolvedHomeCardProps = buildLoanStatusCardProps();
  const isUnderReviewState =
    userStage === UserStagesInBackend.APPLICATION_STATUS ||
    isLoanStatusPending(activeLoanQuery.data?.loanStatus);
  const isInitialUnsyncedState =
    userStage == null && phaseIndex === 0 && substepIndex === 0 && !applicationCompleted;
  const shouldHideJourneyUntilDetailsSubmitted =
    phaseIndex === 0 && substepIndex === 0 && !applicationCompleted;
  const isRegisterStage =
    userStage != null && USER_STAGE_GROUPS.register.includes(userStage);
  const isApplyForLoanState =
    !isUserStageLoading &&
    (isRegisterStage || isInitialUnsyncedState);

  if (isApplyForLoanState) {
    const initialStateAmount = resolvedHomeCardProps.amount ?? DEFAULT_ACTIVE_LOAN_AMOUNT;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.applyScrollContent,
          { paddingBottom: tabBarHeight + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ApplyForLoanHomeView
          amount={initialStateAmount}
          actionLabel={resolvedHomeCardProps.actionLabel || 'Apply for Loan'}
          hideJourney={shouldHideJourneyUntilDetailsSubmitted}
          onApplyPress={handleResumeJourney}
          onCreditScorePress={handleCreditReportPress}
          onContactPress={() => router.push('/need-help')}
        />
        <ContactSupport />
      </ScrollView>
    );
  }

  return (
    <>
      <FullScreenModal
        visible={productsModalVisible}
        onClose={() => setProductsModalVisible(false)}
        title="All Products"
        subtitle="Discover a range of loan solutions tailored to your needs"
      >
        <ProductsGrid onProductPress={handleProductPressFromModal} />
      </FullScreenModal>
      {cancellationLoanId != null ? (
        <LoanCancellationModal
          visible={isCancellationModalVisible}
          loanId={cancellationLoanId}
          onClose={handleCloseCancellationModal}
          onLoanCancelled={handleLoanCancelled}
        />
      ) : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.applyScrollContent,
          { paddingBottom: tabBarHeight + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ApplyForLoanHomeView
          amount={resolvedHomeCardProps.amount ?? DEFAULT_ACTIVE_LOAN_AMOUNT}
          actionLabel={resolvedHomeCardProps.actionLabel || 'Apply for Loan'}
          heroContent={renderLoanStatusSection()}
          hideJourney={isCblOrRejectedStage(userStage) || isUnderReviewState}
          hideJourneyProgress={isUnderReviewState}
          onApplyPress={resolvedHomeCardProps.onActionPress}
          onCreditScorePress={handleCreditReportPress}
          onContactPress={() => router.push('/need-help')}
        />
        <ContactSupport />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    paddingTop: spacing.base,
    backgroundColor: colors.transparent,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xs,
  },
  applyScrollContent: {
    paddingBottom: spacing['6xl'],
  },
  content: {
    paddingBottom: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.sm,
    // marginBottom: spacing['3xl'],
  },
  productsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    gap: spacing.base,
  },
  productCardMargin: {
    marginRight: 0,
  },
  offersScroll: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
  },
  testimonials: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
  },
  subtitle: {
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  googleButtonContainer: {
    marginBottom: spacing.lg,
  },
});

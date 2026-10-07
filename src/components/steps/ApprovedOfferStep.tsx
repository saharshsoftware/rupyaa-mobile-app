import React, { useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { AppText } from '../AppText';
import { ActionCard } from '../ActionCard';
import { Button } from '../Button';
import { FormLayout } from '../FormLayout';
import { ZapcashLoading } from '../ZapcashLoading';
import { EmiApprovedOfferContent } from './EmiApprovedOfferContent';
import { PayDayApprovedOfferContent } from './PayDayApprovedOfferContent';
import type {
  ApprovedOfferBodyProps,
  CurrentOfferOffer,
  LoanType,
  OfferTypeContentProps,
  StepProps,
} from '@/src/types';
import { colors, spacing } from '@/src/theme';
import { consoleLogDev } from '@/src/utils/common-helper';
import { isEmiLoanType } from '../../utils/offer-helpers';
import { useApprovedOfferStep } from './useApprovedOfferStep';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import { ANALYTICS_EVENT, logAnalyticsEvent } from '@/src/services/analytics';

/** Dev simulation: mock EMI offer matching Figma reference. */
const SIM_OFFER: CurrentOfferOffer = {
  _id: 'sim',
  offerAmount: 50000,
  loanTenure: 3,
  interestRate: 10.6,
  payableAmount: 53000,
  emiAmount: 17108.33,
  processingFee: 1675,
  emiDeductionDay: 5,
  status: 'active',
};
const SIM_LOAN_TYPE: LoanType = 'EMI';

const GET_HIGHER_LOAN_TITLE = 'Get a Higher Loan Amount';
const GET_HIGHER_LOAN_SUBTEXT =
  'Connect your bank securely to check if you qualify for a better offer. Your current offer remains safe';

function OfferTypeContent({ offer, loanType, emiOffer }: OfferTypeContentProps) {
  const isEmiOffer = isEmiLoanType(loanType);
  let content: React.ReactNode;

  if (isEmiOffer) {
    content = <EmiApprovedOfferContent offer={offer} emiOffer={emiOffer} />;
  } else {
    content = <PayDayApprovedOfferContent offer={offer} loanType={loanType} />;
  }

  return content;
}

function ApprovedOfferBody({
  offer,
  loanType,
  emiOffer,
  showImproveOfferAction,
  improveOfferByUsingBsa,
  acceptError,
}: ApprovedOfferBodyProps) {
  return (
    <>
      <OfferTypeContent offer={offer} loanType={loanType} emiOffer={emiOffer} />
      {showImproveOfferAction && (
        <ActionCard
          title={GET_HIGHER_LOAN_TITLE}
          subtext={GET_HIGHER_LOAN_SUBTEXT}
          onPress={improveOfferByUsingBsa}
        />
      )}
      {acceptError != null && (
        <AppText style={styles.errorText} variant="caption">
          {acceptError}
        </AppText>
      )}
    </>
  );
}

export function ApprovedOfferStep({ onNext, onPrev }: StepProps) {
  const { isSimulating, simulatedState } = useStepSimulation();

  const handleAcceptSuccess = useCallback(() => {
    void logAnalyticsEvent(ANALYTICS_EVENT.REVIEW_OFFER_PAGE_CLICK);
    onNext();
  }, [onNext]);

  const {
    offer,
    emiOffer,
    loanType,
    isApproved,
    isOfferResolved,
    showImproveOfferAction,
    improveOfferByUsingBsa,
    acceptOffer,
    isAccepting,
    acceptError,
    clearAcceptError,
    refreshOffer,
    isRefreshing,
    refreshError,
    clearRefreshError,
  } = useApprovedOfferStep({
    onAcceptSuccess: handleAcceptSuccess,
    onAcceptError: () => undefined,
  });

  const handleRefreshClick = useCallback(() => {
    clearRefreshError();
    refreshOffer();
  }, [clearRefreshError, refreshOffer]);

  const handleAcceptPress = useCallback(() => {
    clearAcceptError();
    acceptOffer();
  }, [clearAcceptError, acceptOffer]);

  const buttonLabel = isApproved ? 'Accept & Continue' : 'Refresh to Check';
  const buttonAction = isApproved ? handleAcceptPress : handleRefreshClick;
  const buttonDisabled = isRefreshing || isAccepting;
  const showRefreshError = refreshError != null && !isRefreshing;

  const renderContent = (): React.ReactNode => {
    consoleLogDev('[ApprovedOfferStep]  isApproved', isApproved);
    consoleLogDev('offer', offer);
    if (isApproved && offer) {
      return (
        <ApprovedOfferBody
          offer={offer}
          loanType={loanType}
          emiOffer={emiOffer}
          showImproveOfferAction={showImproveOfferAction}
          improveOfferByUsingBsa={improveOfferByUsingBsa}
          acceptError={acceptError}
        />
      );
    }
    return (
      <>
        <AppText style={styles.title} variant="h3" weight="bold">
          No offer found
        </AppText>
        <AppText style={styles.subtitle} variant="body">
          Please try again later.
        </AppText>
        {showRefreshError && (
          <AppText style={styles.errorText} variant="body">
            {refreshError}
          </AppText>
        )}
        {isRefreshing && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}
      </>
    );
  };

  const showLoadingOverlay = !isOfferResolved;

  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <ZapcashLoading
          visible
          title="Loading your offer"
          message="Please wait..."
          source="ApprovedOfferStep"
        />
      );
    }
    if (simulatedState === 'success') {
      return (
        <FormLayout
          showContactSupport
          safeAreaEdges={['bottom']}
          onBack={onPrev}
          footer={
            <Button variant="primary" size="large" fullWidth onPress={() => {}}>
              Accept & Continue
            </Button>
          }
        >
          <View style={styles.content}>
            <OfferTypeContent offer={SIM_OFFER} loanType={SIM_LOAN_TYPE} />
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'error') {
      return (
        <FormLayout
          showContactSupport
          safeAreaEdges={['bottom']}
          onBack={onPrev}
          footer={
            <Button variant="primary" size="large" fullWidth onPress={() => {}}>
              Refresh to Check
            </Button>
          }
        >
          <View style={styles.content}>
            <AppText style={styles.title} variant="h3" weight="bold">
              No offer found
            </AppText>
            <AppText style={styles.subtitle} variant="body">
              Please try again later.
            </AppText>
            <AppText style={styles.errorText} variant="body">
              Simulated error: Unable to load offer.
            </AppText>
          </View>
        </FormLayout>
      );
    }
  }

  if (showLoadingOverlay) {
    return (
      <FormLayout showContactSupport safeAreaEdges={['bottom']}>
        <ZapcashLoading visible={showLoadingOverlay} />
      </FormLayout>
    );
  }
  return (
    <FormLayout
      showContactSupport
      safeAreaEdges={['bottom']}
      onBack={onPrev}
      footer={
        <>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onPress={buttonAction}
            disabled={buttonDisabled}
            loading={isAccepting}
          >
            {isRefreshing ? 'Checking...' : buttonLabel}
          </Button>
        </>
      }
    >
      <View style={styles.content}>{renderContent()}</View>

      <ZapcashLoading
        visible={showLoadingOverlay}
        title="Loading your offer"
        message="Please wait..."
        source="ApprovedOfferStep"
      />
    </FormLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.sm,
  },
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error.main,
    marginBottom: spacing.sm,
  },
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
});

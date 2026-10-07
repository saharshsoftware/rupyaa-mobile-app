import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ContactSupport } from '../ContactSupport';
import { FormLayout } from '../FormLayout';
import { SuccessModal } from '../SuccessModal';
import { UnderReviewModal } from '../UnderReviewModal';
import { goHomeWithFallback, HOME_ROUTE } from '@/src/services/navigation/homeNavigation';
import type { StepProps } from '@/src/types/flow';
import { spacing } from '@/src/theme';
import { useCurrentOfferStore } from '@/src/store/useCurrentOfferStore';
import { isCurrentOfferSuccess } from '@/src/types/offer';
import { formatCurrency } from '@/src/utils/common-helper';
import { BankConnectStepContent } from './bank-connect/BankConnectStepContent';
import { BankConnectContinueSecurelyButton } from './bank-connect/BankConnectContinueSecurelyButton';
import { BankConnectStepFooter } from './bank-connect/BankConnectStepFooter';
import { BankConnectWebViewModal } from './bank-connect/BankConnectWebViewModal';
import { PdfPasswordModal } from './bank-connect/PdfPasswordModal';
import { useBankConnectStepController } from './bank-connect/useBankConnectStepController';
import {
  BankConnectFetchingContent,
  BankConnectMobileContent,
  BankStatementPendingContent,
} from './bank-connect/BankConnectContent';
import { useStepSimulation } from '@/src/hooks/useStepSimulation';
import type { BankConnectChecklistItem } from './bank-connect/bankConnectContinueMessages';
import { getManualUploadStatementRangeDescription } from '@/src/utils/bankStatementPeriod';
import { ZapcashLoading } from '../ZapcashLoading';

/** Dev simulation: checklist with all steps done. */
const SIM_CHECKLIST_SUCCESS: BankConnectChecklistItem[] = [
  { id: 'fetch', label: 'Fetching bank statement', state: 'done' },
  { id: 'process', label: 'Processing statement', state: 'done' },
];

export function BankConnectStep({ onNext, onPrev }: StepProps) {
  const router = useRouter();
  const { isSimulating, simulatedState } = useStepSimulation();
  
  const handleUnderReviewGoHome = useCallback(() => {
    router.replace(HOME_ROUTE);
  }, [router]);

  const {
    attemptState,
    attemptsLeft,
    isAaEnabled,
    cameFromOfferings,
    closeWebView,
    fetchErrorMessage,
    goToMobileView,
    handleBackToExistingOffer,
    handleCancelUpload,
    handleContinueWithExistingOffer,
    handleFetchBankDetails,
    handleGoToManualUpload,
    handlePickStatementFile,
    handleRemoveFile,
    handleUploadPress,
    handleWebViewBankStatementSuccess,
    handleRetryFetchBankStatement,
    handleRedoAccountAggregation,
    isConnectPending,
    isInitialStatusLoading,
    isPolling,
    isPickingStatementFile,
    isUploadPending,
    isWebViewOpen,
    isResolvingWebViewStatus,
    mobile,
    offerLoanStatus,
    statusMessage,
    bankConnectChecklistItems,
    resolvedView,
    selectedStatementFileName,
    setMobile,
    shouldShowOfferReadyAction,
    shouldShowOfferingContinueAction,
    shouldShowOfferingRetryAction,
    tempUrl,
    uploadProgress,
    uploadedFileName,
    bankStatementStatus = 'unknown',
    pollingTimedOut,
    showUnderReviewOverlay,
    showPdfPasswordModal,
    onPdfPasswordSubmit,
    onClosePdfPasswordModal,
  } = useBankConnectStepController({ onNext });

  const lastOfferResponse = useCurrentOfferStore((s) => s.lastResponse);
  const currentOfferAmount =
    lastOfferResponse?.success &&
    lastOfferResponse.data != null &&
    isCurrentOfferSuccess(lastOfferResponse.data)
      ? lastOfferResponse.data.offer?.offerAmount
      : undefined;

  const bankConnectActionCardSubtext = useMemo(() => {
    if (currentOfferAmount != null) {
      return `Proceed with your approved amount of ${formatCurrency(currentOfferAmount, true)}.`;
    }
    return 'Proceed with your current offer.';
  }, [currentOfferAmount]);

  const bankConnectActionCard = useMemo(
    () => ({
      title: 'Keep My Current Offer',
      subtext: bankConnectActionCardSubtext,
      onPress: handleContinueWithExistingOffer,
    }),
    [bankConnectActionCardSubtext, handleContinueWithExistingOffer]
  );

  const manualUploadActionCard = useMemo(
    () => ({
      title: 'Upload bank statement PDF manually' as const,
      subtext: getManualUploadStatementRangeDescription(),
      onPress: handleGoToManualUpload,
    }),
    [handleGoToManualUpload]
  );

  const pendingActionCard = useMemo(() => {
    if (attemptState !== 'aa-with-manual' && attemptState !== 'manual-only') return undefined;
    return manualUploadActionCard;
  }, [attemptState, manualUploadActionCard]);

  const mobileManualUploadCard = useMemo(() => {
    if (attemptState !== 'aa-with-manual') return undefined;
    return manualUploadActionCard;
  }, [attemptState, manualUploadActionCard]);

  const pendingInfoNote = useMemo(() => {
    const infoParts: string[] = [];
    if (attemptsLeft.aaAttemptsLeft != null) {
      infoParts.push(`AA attempts left: ${Math.max(0, attemptsLeft.aaAttemptsLeft)}`);
    }
    if (attemptsLeft.manualUploadAttemptsLeft != null) {
      infoParts.push(
        `Manual upload attempts left: ${Math.max(0, attemptsLeft.manualUploadAttemptsLeft)}`
      );
    }
    return infoParts.length > 0 ? infoParts.join('  |  ') : undefined;
  }, [attemptsLeft]);

  // When status is already approved, force the pending view immediately so we don't briefly show entry.
  // in-progress stays on entry so the user can retry BSA (polling is off for that status).
  const effectiveResolvedView =
    bankStatementStatus === 'approved' && resolvedView !== 'bank-statement-pending'
      ? 'bank-statement-pending'
      : resolvedView;

  /** Back button behavior by current view. */
  const onBack = (() => {
    switch (effectiveResolvedView) {
      case 'mobile':
        return cameFromOfferings ? handleBackToExistingOffer : onPrev;
      case 'upload-idle':
        return isAaEnabled ? goToMobileView : onPrev;
      case 'upload-progress':
        return handleCancelUpload;
      case 'upload-success':
        return handleRemoveFile;
      case 'bank-statement-pending':
        return cameFromOfferings ? handleBackToExistingOffer : onPrev;
    }
  })();
  const mobileInlinePrimaryCta =
    effectiveResolvedView === 'mobile' && !shouldShowOfferingRetryAction;

  // ═══════════════════════════════════════
  //  DEV SIMULATION (loading / success / error)
  // ═══════════════════════════════════════
  if (isSimulating) {
    if (simulatedState === 'loading') {
      return (
        <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.content}>
            <BankConnectFetchingContent />
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'success') {
      return (
        <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.content}>
            <BankStatementPendingContent
              isPolling={false}
              message=""
              checklistItems={SIM_CHECKLIST_SUCCESS}
            />
          </View>
        </FormLayout>
      );
    }
    if (simulatedState === 'error') {
      return (
        <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onPrev} footer={<View />}>
          <View style={styles.content}>
            <BankConnectMobileContent
              mobile=""
              onChangeMobile={() => {}}
              errorMessage="Simulated error: Could not fetch bank details."
            />
          </View>
        </FormLayout>
      );
    }
  }

  // ═══════════════════════════════════════
  //  LOADING GATE (initial status + resolving webview status)
  // ═══════════════════════════════════════
  if (isInitialStatusLoading) {
    return (
      <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onBack} footer={<View />}>
        <View style={styles.loadingContainer}>
          <ZapcashLoading
            visible={true}
            message="We're fetching and verifying your bank statement."
            source="BankConnectStep"
          />
        </View>
      </FormLayout>
    );
  }

  if (isResolvingWebViewStatus) {
    return (
      <FormLayout showContactSupport safeAreaEdges={['bottom']} onBack={onBack} footer={<View />}>
        <View style={styles.loadingContainer}>
          <ZapcashLoading
            visible={true}
            message="We're fetching and verifying your bank statement."
            source="BankConnectStep"
          />
        </View>
      </FormLayout>
    );
  }

  // ═══════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════
  return (
    <>
      <FormLayout showContactSupport={!mobileInlinePrimaryCta}
        safeAreaEdges={['bottom']}
        onBack={onBack}
        footer={
          mobileInlinePrimaryCta ? null : <BankConnectStepFooter
              resolvedView={effectiveResolvedView}
              cameFromOfferings={cameFromOfferings}
              isPolling={isPolling}
              shouldShowOfferReadyAction={shouldShowOfferReadyAction}
              shouldShowOfferingRetryAction={shouldShowOfferingRetryAction}
              shouldShowOfferingContinueAction={shouldShowOfferingContinueAction}
              onContinueWithExistingOffer={handleContinueWithExistingOffer}
              onRetryFetchBankStatement={handleRetryFetchBankStatement}
              onRedoAccountAggregation={handleRedoAccountAggregation}
              bankStatementStatus={bankStatementStatus}
              offerLoanStatus={offerLoanStatus}
              pollingTimedOut={pollingTimedOut}
          />
        }
      >
        <View style={styles.content}>
          <BankConnectStepContent
            resolvedView={effectiveResolvedView}
            mobile={mobile}
            onChangeMobile={setMobile}
            fetchErrorMessage={fetchErrorMessage}
            uploadProgress={uploadProgress}
            uploadedFileName={uploadedFileName}
            selectedStatementFileName={selectedStatementFileName}
            onPickStatementFile={handlePickStatementFile}
            onRemoveFile={handleRemoveFile}
            onUploadPress={handleUploadPress}
            isPickingStatementFile={isPickingStatementFile}
            isUploading={isUploadPending}
            isPolling={isPolling}
            statusMessage={statusMessage}
            bankConnectChecklistItems={bankConnectChecklistItems}
            pollingTimedOut={pollingTimedOut}
            actionCard={
              mobileManualUploadCard ??
              (shouldShowOfferingContinueAction
                ? bankConnectActionCard
                : undefined)
            }
            secondaryActionCard={
              mobileManualUploadCard != null && shouldShowOfferingContinueAction
                ? bankConnectActionCard
                : undefined
            }
            mobilePrimaryCta={
              mobileInlinePrimaryCta ? (
                <>
                  <ContactSupport />
                  <BankConnectContinueSecurelyButton
                    mobile={mobile}
                    isConnectPending={isConnectPending}
                    onPress={handleFetchBankDetails}
                    matchManualUploadActionCardHeight={
                      shouldShowOfferingContinueAction ||
                      attemptState === 'aa-with-manual'
                    }
                  />
                </>
              ) : undefined
            }
            pendingActionCard={pendingActionCard}
            pendingInfoNote={pendingInfoNote}
          />
        </View>
      </FormLayout>

      {/* <SuccessModal
        visible={bankStatementStatus === 'processed'}
        title="Bank linked!"
        message="Bank linked and verified successfully!"
      /> */}

      <BankConnectWebViewModal
        visible={isWebViewOpen}
        tempUrl={tempUrl}
        onClose={closeWebView}
        onBankStatementSuccess={handleWebViewBankStatementSuccess}
      />

      <UnderReviewModal
        visible={showUnderReviewOverlay}
        onCtaPress={handleUnderReviewGoHome}
      />

      <PdfPasswordModal
        visible={showPdfPasswordModal}
        onClose={onClosePdfPasswordModal}
        onSubmit={onPdfPasswordSubmit}
        loading={isUploadPending}
        errorMessage={fetchErrorMessage || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

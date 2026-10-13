import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Header, AppText, ZapcashLoading } from '@/src/components';
import { PaymentSuccessModal } from '@/src/components/PaymentSuccessModal';
import { ForeclosureCard } from '@/src/components/loans';
import { colors, spacing } from '@/src/theme';
import { useGetExistingActiveLoanWithPaidRedirect } from '@/src/services/loans';
import { useCreatePaymentOrder, openCashfreePaymentCheckout } from '@/src/services/payment';
import { resolveForeclosureTotalPayable } from '@/src/utils/loan-helpers';
import { fetchAndStoreAppConfig } from '@/src/hooks/useExternalAppConfig';
import { pollPaymentStatus } from '@/src/utils/pollPaymentStatus';
import { VERIFY_PAYMENT_MESSAGE } from '@/src/constants/data';

/**
 * Full-screen foreclosure: thin wrapper around ForeclosureCard.
 * Data from Get Existing Active Loan; CTA creates payment order and opens Cashfree checkout.
 * On success, shows a modal with remaining balance (if any).
 */
export default function OfferForeclosuerScreen() {
  const { t } = useTranslation();
  const activeLoanQuery = useGetExistingActiveLoanWithPaidRedirect();
  const createPaymentOrderMutation = useCreatePaymentOrder();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const verifyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      verifyAbortRef.current?.abort();
    };
  }, []);

  const loan = activeLoanQuery.data?.loan ?? null;
  const isLoading =
    activeLoanQuery.isPending ||
    activeLoanQuery.shouldRedirectToHome ||
    (activeLoanQuery.isFetching && activeLoanQuery.data == null);
  // resolveForeclosureTotalPayable is the single source of truth for this amount.
  const foreclosureAmount = resolveForeclosureTotalPayable(loan);
  const totalDueOnDueDate = loan?.totalPayable ?? 0;
  const interestSaved = Math.max(0, totalDueOnDueDate - foreclosureAmount);

  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModal(false);
    void activeLoanQuery.refetch();
  }, [activeLoanQuery]);

  const handleContinueToHomepage = useCallback(() => {
    handleSuccessModalClose();
    router.replace('/');
  }, [handleSuccessModalClose]);

  const handleForecloseNow = useCallback(() => {
    handleSuccessModalClose();
  }, [handleSuccessModalClose]);

  const handleForeclosePress = useCallback(async () => {
    if (!loan?._id) return;
    setPaymentError(null);
    try {
      await fetchAndStoreAppConfig();
      const data = await createPaymentOrderMutation.mutateAsync({
        loanId: loan._id,
        amount: foreclosureAmount,
      });
      openCashfreePaymentCheckout(
        data.payment_session_id,
        data.order_id,
        {
          onVerify: async (orderId: string) => {
            const controller = new AbortController();
            verifyAbortRef.current = controller;
            setIsVerifyingPayment(true);
            try {
              const finalStatus = await pollPaymentStatus(orderId, controller.signal);
              if (finalStatus === 'SUCCESS') {
                setPaidAmount(foreclosureAmount);
                setShowSuccessModal(true);
              } else {
                setPaymentError('Payment failed. Please try again.');
              }
            } catch (e) {
              if (e instanceof Error && e.name === 'AbortError') {
                return;
              }
              const message =
                e instanceof Error
                  ? e.message
                  : 'Could not verify payment status. Please check your payment app.';
              setPaymentError(message);
            } finally {
              setIsVerifyingPayment(false);
            }
          },
          onError: (message: string) => {
            setPaymentError(message);
          },
        }
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setPaymentError(message);
    }
  }, [loan?._id, foreclosureAmount, createPaymentOrderMutation.mutateAsync]);

  const error = activeLoanQuery.error;

  if (isLoading) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']} style={styles.plainScreen}>
        <Header title={t('Foreclose Your Loan')} showBack onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <AppText variant="body" style={styles.message}>
            Loading your loan...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']} style={styles.plainScreen}>
        <Header title={t('Foreclose Your Loan')} showBack onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <AppText variant="body" color="error" style={styles.message}>
            {error instanceof Error ? error.message : 'Failed to load loan.'}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (!loan) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']} style={styles.plainScreen}>
        <Header title={t('Foreclose Your Loan')} showBack onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <AppText variant="body" style={styles.message}>
            No active loan found.
          </AppText>
        </View>
      </Screen>
    );
  }

  const remainingBalance = Math.max(0, foreclosureAmount - paidAmount);

  return (
    <Screen scroll={false} edges={['top', 'bottom']} style={styles.plainScreen}>
      <Header title={t('Foreclose Your Loan')} showBack onBackPress={() => router.back()} />
      {isVerifyingPayment ? (
        <View style={styles.centered}>
          <ZapcashLoading visible={true} title={VERIFY_PAYMENT_MESSAGE.TITLE} message={VERIFY_PAYMENT_MESSAGE.MESSAGE} />
        </View>
      ) : (
        <View style={styles.cardWrap}>
          <ForeclosureCard
            loan={loan}
            foreclosureAmount={foreclosureAmount}
            interestSaved={interestSaved}
            totalDueOnDueDate={totalDueOnDueDate}
            onForeclosePress={handleForeclosePress}
            ctaLoading={createPaymentOrderMutation.isPending || isVerifyingPayment}
            ctaError={paymentError}
          />
        </View>
      )}
      <PaymentSuccessModal
        visible={showSuccessModal}
        amountPaid={paidAmount}
        remainingBalance={remainingBalance > 0 ? remainingBalance : undefined}
        variant="foreclosure"
        onContinueToHomepage={handleContinueToHomepage}
        onForecloseNow={handleForecloseNow}
        onRequestClose={handleSuccessModalClose}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  plainScreen: {
    backgroundColor: colors.background.primary,
  },
  cardWrap: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

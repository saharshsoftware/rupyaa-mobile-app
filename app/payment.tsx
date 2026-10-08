import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Header, AppText, ZapcashLoading } from '@/src/components';
import { PaymentSuccessModal } from '@/src/components/PaymentSuccessModal';
import { PaymentCard } from '@/src/components/loans';
import { colors, spacing } from '@/src/theme';
import { useGetExistingActiveLoanWithPaidRedirect } from '@/src/services/loans';
import { useCreatePaymentOrder, openCashfreePaymentCheckout } from '@/src/services/payment';
import { fetchAndStoreAppConfig } from '@/src/hooks/useExternalAppConfig';
import { pollPaymentStatus } from '@/src/utils/pollPaymentStatus';
import { VERIFY_PAYMENT_MESSAGE } from '@/src/constants/data';

/**
 * Dedicated Make Payment screen. Fetches active loan and shows PaymentCard.
 * CTA creates payment order and opens Cashfree checkout. On success, shows a modal with remaining balance (if any).
 */
export default function PaymentScreen() {
  const { t } = useTranslation();
  const activeLoanQuery = useGetExistingActiveLoanWithPaidRedirect();
  const createPaymentOrderMutation = useCreatePaymentOrder();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [customAmountResetKey, setCustomAmountResetKey] = useState(0);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const verifyAbortRef = useRef<AbortController | null>(null);

  // Abort in-flight order-status polling if user leaves the screen (avoids setState after unmount).
  useEffect(() => {
    return () => {
      verifyAbortRef.current?.abort();
    };
  }, []);

  // Reset custom amount input when user comes back to the payment screen (e.g. after Cashfree or navigation)
  useFocusEffect(
    useCallback(() => {
      setCustomAmountResetKey((k) => k + 1);
    }, [])
  );

  const loan = activeLoanQuery.data?.loan ?? null;
  const paymentLeft = loan?.amountDue ?? 0;
  const isLoading =
    activeLoanQuery.isPending ||
    activeLoanQuery.shouldRedirectToHome ||
    (activeLoanQuery.isFetching && activeLoanQuery.data == null);
  const error = activeLoanQuery.error;

  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModal(false);
    setCustomAmountResetKey((k) => k + 1); // Reset custom amount after payment so user sees clean state
    void activeLoanQuery.refetch();
  }, [activeLoanQuery]);

  const handleContinueToHomepage = useCallback(() => {
    handleSuccessModalClose();
    router.replace('/');
  }, [handleSuccessModalClose]);

  const handlePaymentPress = useCallback(async (amount: number) => {
    if (!loan?._id) return;
    setPaymentError(null);
    try {
      // Wait for GET /external/config so Cashfree env + playStorePhoneNumbers are loaded before opening SDK.
      await fetchAndStoreAppConfig();
      const data = await createPaymentOrderMutation.mutateAsync({
        loanId: loan._id,
        amount,
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
                setPaidAmount(amount);
                setShowSuccessModal(true);
              } else {
                setPaymentError('Payment failed. Please try again.');
              }
            } catch (e) {
              // RN may not expose DOMException; any AbortError means unmount/navigation.
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
  }, [loan?._id, createPaymentOrderMutation.mutateAsync]);

  if (isLoading) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <Header title={t('Make Payment')} showBack onBackPress={() => router.back()} />
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
      <Screen scroll={false} edges={['top', 'bottom']}>
        <Header title={t('Make Payment')} showBack onBackPress={() => router.back()} />
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
      <Screen scroll={false} edges={['top', 'bottom']}>
        <Header title={t('Make Payment')} showBack onBackPress={() => router.back()} />
        <View style={styles.centered}>
          <AppText variant="body" style={styles.message}>
            No active loan found.
          </AppText>
        </View>
      </Screen>
    );
  }

  const remainingBalance = Math.max(0, paymentLeft - paidAmount);

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <Header title={t('Make Payment')} showBack onBackPress={() => router.back()} />
      {isVerifyingPayment ? (
        <View style={styles.centered}>
          <ZapcashLoading visible={true} title={VERIFY_PAYMENT_MESSAGE.TITLE} message={VERIFY_PAYMENT_MESSAGE.MESSAGE} />
        </View>
      ) : (
        <View style={styles.cardWrap}>
          <PaymentCard
            loan={loan}
            onPaymentPress={handlePaymentPress}
            ctaLoading={createPaymentOrderMutation.isPending || isVerifyingPayment}
            ctaError={paymentError}
            resetCustomAmountKey={customAmountResetKey}
          />
        </View>
      )}
      <PaymentSuccessModal
        visible={showSuccessModal}
        amountPaid={paidAmount}
        remainingBalance={remainingBalance > 0 ? remainingBalance : undefined}
        variant="payment"
        onContinueToHomepage={handleContinueToHomepage}
        onRequestClose={handleSuccessModalClose}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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

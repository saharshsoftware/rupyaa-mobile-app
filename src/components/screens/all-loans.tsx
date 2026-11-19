import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  FlatList,
  Linking,
} from 'react-native';
import { AppText, Screen, ZapcashLoading } from '@/src/components';
import { SuccessModal } from '@/src/components/SuccessModal';
import { ErrorModal } from '@/src/components/ErrorModal';
import { spacing, radius } from '@/src/theme';
import { useAllUserLoans, requestLoanNoc, parseLoanNocResult } from '@/src/services/loans';
import { getApiErrorDisplayMessage } from '@/src/utils/common-helper';
import { MyLoanCard, LoanTabBar } from '@/src/components/loans';
import { classifyLoans } from '@/src/utils/loan-helpers';
import { commonStyles } from '@/src/utils/common-styles';
import { IMAGES } from '@/src/constants/images';
import type { Loan } from '@/src/types/loans';
import { router, useFocusEffect } from 'expo-router';
import { resolveActiveLoanScreenType } from '@/src/utils/loan-helpers';

export default function AllLoansScreen() {
  const { data, isLoading, error, isError, refetch } = useAllUserLoans();

  useFocusEffect(useCallback(() => {
    void refetch();
  }, [refetch]));

  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
  const [nocRequestLoanId, setNocRequestLoanId] = useState<string | null>(null);
  const [isNocSuccessModalVisible, setIsNocSuccessModalVisible] = useState(false);
  const [nocSuccessMessage, setNocSuccessMessage] = useState('');
  const [isNocErrorModalVisible, setIsNocErrorModalVisible] = useState(false);
  const [nocErrorMessage, setNocErrorMessage] = useState('');
  const [nocRetryLoan, setNocRetryLoan] = useState<Loan | null>(null);
  const pendingNocUrlRef = useRef<string | null>(null);

  const filteredLoans = useMemo(() => {
    if (!data?.loans) return [];
    return data.loans;
  }, [data]);

  const { ongoing, history } = useMemo(
    () => classifyLoans(filteredLoans),
    [filteredLoans]
  );

  const activeLoans = activeTab === 'ongoing' ? ongoing : history;

  const showNocErrorModal = useCallback((message: string, loan?: Loan) => {
    setNocErrorMessage(message);
    setNocRetryLoan(loan ?? null);
    setIsNocErrorModalVisible(true);
  }, []);

  const showNocSuccessModal = useCallback((message: string, openUrl: string | null) => {
    pendingNocUrlRef.current = openUrl;
    setNocSuccessMessage(message);
    setIsNocSuccessModalVisible(true);
  }, []);

  const handleNocSuccessClose = useCallback(async () => {
    setIsNocSuccessModalVisible(false);
    const url = pendingNocUrlRef.current;
    pendingNocUrlRef.current = null;
    setNocSuccessMessage('');

    if (!url) return;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showNocErrorModal(
          'Your NOC was generated but could not be opened on this device.'
        );
        return;
      }
      await Linking.openURL(url);
    } catch {
      showNocErrorModal(
        'Your NOC was generated but could not be opened on this device.'
      );
    }
  }, [showNocErrorModal]);

  const handleNocErrorClose = useCallback(() => {
    setIsNocErrorModalVisible(false);
    setNocErrorMessage('');
    setNocRetryLoan(null);
  }, []);

  const handleRequestNoc = useCallback(
    async (loan: Loan) => {
      const loanId = loan._id?.trim();
      if (!loanId || nocRequestLoanId !== null) return;

      setNocRequestLoanId(loanId);
      try {
        const response = await requestLoanNoc(loanId);
        if (!response.success) {
          const message =
            getApiErrorDisplayMessage(response.error) ||
            'Could not request your NOC. Please try again.';
          showNocErrorModal(message, loan);
          return;
        }

        const parsed = parseLoanNocResult(response.data);
        const openUrl = parsed?.openUrl ?? null;

        const successMessage =
          parsed?.message ??
          (openUrl
            ? 'Your No Objection Certificate is ready. Tap OK to view your document.'
            : 'Your No Objection Certificate has been requested successfully.');

        showNocSuccessModal(successMessage, openUrl);
      } catch {
        showNocErrorModal(
          'Something went wrong. Please check your connection and try again.',
          loan
        );
      } finally {
        setNocRequestLoanId(null);
      }
    },
    [nocRequestLoanId, showNocErrorModal, showNocSuccessModal]
  );

  const handleNocErrorRetry = useCallback(() => {
    const loan = nocRetryLoan;
    handleNocErrorClose();
    if (loan) {
      void handleRequestNoc(loan);
    }
  }, [nocRetryLoan, handleNocErrorClose, handleRequestNoc]);

  const errorMessage = error instanceof Error ? error.message : '';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ZapcashLoading visible={true} message="Loading your loans..." />
        </View>
      </View>
    );
  }

  if (isError && errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AppText variant="body" color="error">
            {errorMessage}
          </AppText>
        </View>
      </View>
    );
  }

  // console.log('filteredLoans', filteredLoans);

  const hasNoLoans = filteredLoans.length === 0;
  // const hasNoActiveLoans = activeLoans.length === 0;
  if (hasNoLoans) {
    return (
      <Screen scroll={false} edges={[]}>
        <View style={commonStyles.fullCenter}>
          <View style={styles.emptyImageContainer}>
            <Image
              source={IMAGES.NO_LOAN}
              resizeMode="contain"
              style={styles.emptyStateImage}
              accessibilityLabel="No ongoing loan"
            />
          </View>
          <AppText variant="caption" color="black" style={styles.emptyStateSubtitle}>
            No active loans found. Apply now to get quick, hassle-free financing that fits your needs.
          </AppText>
          {/* Matches Documents empty-state CTA height so illustration top gap stays the same. */}
          <View style={styles.emptyStateBalance} />
        </View>
      </Screen>
    );
  }

  const handlePayNow = (loan: Loan) => {
    const screenType = resolveActiveLoanScreenType(loan);
    if (screenType === 'payment') {
      router.push('/payment');
      return;
    }
    if (screenType === 'foreclosure') {
      router.push('/offercard/foreclosuer');
      return;
    }
    router.push('/payment');
  };

  return (
    <>
      <View style={styles.container}>
        <LoanTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeLoans.length === 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContentEmpty}
            showsVerticalScrollIndicator={false}
          >
            <View style={commonStyles.fullCenter}>
              <View style={styles.emptyImageContainer}>
                <Image
                  source={IMAGES.NO_LOAN}
                  resizeMode="contain"
                  style={styles.emptyStateImage}
                  accessibilityLabel={
                    activeTab === 'ongoing' ? 'No ongoing loans' : 'No past loans'
                  }
                />
              </View>
              <AppText
                variant="caption"
                color="tertiary"
                style={styles.emptyStateSubtitle}
              >
                {activeTab === 'ongoing'
                  ? 'No active loans found.'
                  : 'No previous loans found.'}
              </AppText>
              <View style={styles.emptyStateBalance} />
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={activeLoans}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MyLoanCard
                loan={item}
                variant={activeTab}
                onPayNow={activeTab === 'ongoing' ? handlePayNow : undefined}
                onRequestNoc={activeTab === 'history' ? handleRequestNoc : undefined}
                isNocLoading={nocRequestLoanId === item._id}
              />
            )}
          />
        )}
      </View>
      <SuccessModal
        visible={isNocSuccessModalVisible}
        centered
        title="NOC requested"
        message={nocSuccessMessage}
        onClose={handleNocSuccessClose}
        closeLabel="OK"
      />
      <ErrorModal
        visible={isNocErrorModalVisible}
        title="Unable to get NOC"
        message={nocErrorMessage}
        onClose={handleNocErrorClose}
        onRetry={nocRetryLoan ? handleNocErrorRetry : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: spacing.md,
    borderRadius: radius.md,
    margin: spacing.base,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateImage: {
    width: 200,
    height: 200,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  emptyStateBalance: {
    alignSelf: 'stretch',
    height: 48,
    marginTop: spacing.base,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
  },
});

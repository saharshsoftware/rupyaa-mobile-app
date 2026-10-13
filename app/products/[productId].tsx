import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Screen,
  Header,
  AppText,
  ProductHeroCard,
  FeaturedBenefits,
  ProductEligibilityCard,
} from '@/src/components';
import { useLoanJourneyGuard } from '@/src/hooks/useLoanJourneyGuard';
import { getProductById } from '@/src/data/products';
import { IMAGES } from '@/src/constants/images';
import { spacing } from '@/src/theme';

export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { tryOpenLoanJourney } = useLoanJourneyGuard();
  const product = productId ? getProductById(productId) : undefined;

  if (!product) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title={t('Product')} showBack onBackPress={() => router.back()} />
        <View style={styles.errorContainer}>
          <AppText variant="body" color="secondary">
            Product not found.
          </AppText>
        </View>
      </Screen>
    );
  }

  const handleCheckEligibility = () => {
    tryOpenLoanJourney(() => router.push('/loan-journey'));
  };

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <Header title={product.title} showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Hero Card - Image, Title, Subtitle */}
        <ProductHeroCard
          image={product.image}
          title={product.title}
          subtitle={product.subtitle}
        />

        {/* Featured Benefits Section */}
        <FeaturedBenefits features={product.features} />

        {/* Eligibility Checker */}
        <ProductEligibilityCard
          title="Check Your Eligibility"
          description="Find out if you qualify instantly and without any credit impact."
          buttonLabel="Check Eligibility"
          illustration={IMAGES.CHECK_ELIGIBILITY}
          onPress={handleCheckEligibility}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
});

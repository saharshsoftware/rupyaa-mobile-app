import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Image } from 'react-native';
import { colors, spacing, typography } from '@/src/theme';
import { AppText } from '../AppText';
import { IMAGES } from '@/src/constants/images';

const TIGER_WIDTH = 100;
const TIGER_OVERFLOW = 18;

export const SafetyCard = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        {/* Tiger overflows below the text section for a dynamic look */}
        <View style={styles.tigerWrapper}>
          <Image
            source={IMAGES.TIGER}
            style={styles.mascotImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textSection}>
          <View style={styles.titleRow}>
            <AppText variant="h4" weight="bold" color="textprimary">Your Safety </AppText>
            <AppText variant="h4" weight="bold" color="primary">
              Matters
            </AppText>
          </View>

          <AppText variant="captionSmall" color="textprimary" style={styles.paragraph}>
            <AppText variant="caption" weight="semiBold" color="primary">
              Rupyaa
            </AppText>
            {' '}
            {t('will only contact you through official channels, never from a personal number.')}
          </AppText>

          <AppText variant="captionSmall" color="textprimary" style={styles.paragraph}>
            Stay cautious and avoid sharing sensitive information without
            verification.
          </AppText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.base,
    paddingRight: spacing.lg,
    paddingLeft: spacing.sm,
    marginBottom: TIGER_OVERFLOW,
    marginVertical: spacing.base,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tigerWrapper: {
    width: TIGER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  mascotImage: {
    width: TIGER_WIDTH,
    height: 140,
    marginBottom: -TIGER_OVERFLOW,
  },
  textSection: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginBottom: spacing.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
});

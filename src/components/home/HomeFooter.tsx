import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/src/theme';
import { AppText } from '../AppText';

export const HomeFooter = () => {
  return (
    <View style={styles.container}>
      <AppText
        variant="h1"
        weight="bold"
        color="primary"
        align="center"
        style={styles.brandText}
      >
        Rupyaa{'\n'}Forever
      </AppText>

      <AppText variant="body" color="tertiary" align="center">
        Created with 💚 by Rupyaa, India.
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.base,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.base,
  },
  brandText: {
    // fontStyle: 'italic',
    marginBottom: spacing.md,
    fontSize: 50,
    color: colors.text.lightGray,
    lineHeight: 50 * typography.lineHeight.tight,
  },
});

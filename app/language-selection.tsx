import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Screen } from '@/src/components';
import { LANGUAGE_OPTIONS } from '@/src/constants/data';
import { useLocaleStore } from '@/src/store/useLocaleStore';
import { colors, radius, spacing } from '@/src/theme';
import { OnboardingLanguageOptionRow } from './onboarding-language';

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const language = useLocaleStore((state) => state.language);
  const setLanguage = useLocaleStore((state) => state.setLanguage);

  const languageOptionRows = LANGUAGE_OPTIONS.map((option) => (
    <OnboardingLanguageOptionRow
      key={option.code}
      option={option}
      isActive={option.code === language}
      onSelect={setLanguage}
    />
  ));

  return (
    <Screen
      scroll={false}
      edges={['bottom']}
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      <View style={styles.section}>{languageOptionRows}</View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="medium"
          fullWidth
          onPress={() => router.back()}
          style={styles.doneButton}
          textStyle={styles.doneButtonText}
          textSize="sm"
        >
          {t('Done')}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  section: {
    gap: spacing.base,
  },
  footer: {
    marginTop: 'auto',
  },
  doneButton: {
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.warning.light,
    paddingVertical: spacing.sm,
  },
  doneButtonText: {
    color: colors.text.black,
  },
});

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Briefcase, Contact, MapPin, User, type LucideIcon } from 'lucide-react-native';
import { AppText, Screen } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import {
  buildMyProfileViewModel,
  type KeyValueField,
} from '@/src/features/profile/myProfileViewModel';
import { usePersonalDetails } from '@/src/hooks/usePersonalDetails';
import { DeveloperSettingsSection } from '@/src/features/profile/DeveloperSettingsSection';

interface ProfileSectionProps {
  icon: LucideIcon;
  title: string;
  fields: KeyValueField[];
  children?: React.ReactNode;
}

function ValueField({ label, value }: KeyValueField) {
  return (
    <View style={styles.fieldBlock}>
      <AppText style={styles.fieldLabel} variant="caption">{label}</AppText>
      <AppText style={styles.fieldValue} variant="body" weight="medium">{value}</AppText>
    </View>
  );
}

function ProfileSection({ icon: Icon, title, fields, children }: ProfileSectionProps) {
  const rows = fields.map((field, index) => (
    <View key={field.label} style={index > 0 && styles.fieldDivider}>
      <ValueField {...field} />
    </View>
  ));

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Icon size={22} color={colors.primary.main} strokeWidth={1.8} />
        </View>
        <AppText style={styles.sectionTitle} variant="bodyLarge" weight="semiBold">
          {title}
        </AppText>
      </View>
      {rows}
      {children}
    </View>
  );
}

export default function MyProfileScreen() {
  const { personalDetails, isFetching } = usePersonalDetails(true);
  const viewModel = useMemo(
    () => buildMyProfileViewModel(personalDetails),
    [personalDetails],
  );

  if (isFetching && !viewModel.hasAnyData) {
    return (
      <Screen edges={[]} contentContainerStyle={styles.emptyStateWrap}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </Screen>
    );
  }

  if (!viewModel.hasAnyData) {
    return (
      <Screen edges={[]} contentContainerStyle={styles.emptyStateWrap}>
        <View style={styles.emptyState}>
          <AppText style={styles.emptyStateText}>No profile data available</AppText>
        </View>
      </Screen>
    );
  }

  const { dobParts, genderLabel } = viewModel;
  const demographicFields: KeyValueField[] = [];
  if (dobParts) {
    const month = new Date(Number(dobParts.year), Number(dobParts.month) - 1, 1)
      .toLocaleString('en-GB', { month: 'short' });
    demographicFields.push({
      label: 'Date of Birth',
      value: `${dobParts.day} ${month} ${dobParts.year}`,
    });
  }
  if (genderLabel) {
    demographicFields.push({ label: 'Gender', value: genderLabel });
  }
  const demographicRows = demographicFields.map((field, index) => (
    <View key={field.label} style={[styles.demographicField, index > 0 && styles.columnDivider]}>
      <ValueField {...field} />
    </View>
  ));
  const hasPersonalFields = viewModel.personalFields.length > 0;
  const hasDemographics = demographicFields.length > 0;

  return (
    <Screen scroll={false} edges={['bottom']} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {viewModel.basicFields.length > 0 && (
          <ProfileSection icon={User} title="Basic details" fields={viewModel.basicFields} />
        )}
        {(hasPersonalFields || hasDemographics) && (
          <ProfileSection icon={Contact} title="Personal information" fields={viewModel.personalFields}>
            {hasDemographics && (
              <View style={[styles.demographicRow, hasPersonalFields && styles.fieldDivider]}>
                {demographicRows}
              </View>
            )}
          </ProfileSection>
        )}
        {viewModel.residenceFields.length > 0 && (
          <ProfileSection icon={MapPin} title="Residence address" fields={viewModel.residenceFields} />
        )}
        {viewModel.employmentFields.length > 0 && (
          <ProfileSection icon={Briefcase} title="Employment Details" fields={viewModel.employmentFields} />
        )}
        <DeveloperSettingsSection />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.background.primary,
    borderRadius: radius['3xl'],
    borderWidth: 1,
    borderColor: colors.border.light,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.quaternary,
  },
  sectionIconWrap: {
    width: spacing['2xl'],
    height: spacing['2xl'],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.cream,
  },
  sectionTitle: {
    flex: 1,
    color: colors.text.primary,
  },
  fieldBlock: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.text.gray,
    fontSize: typography.fontSize.xs,
  },
  fieldValue: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  },
  fieldDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.text.quaternary,
  },
  demographicRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  demographicField: {
    flex: 1,
  },
  columnDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.text.quaternary,
    paddingLeft: spacing.base,
  },
  emptyStateWrap: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

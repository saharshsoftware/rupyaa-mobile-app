import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import {
  Briefcase,
  FileText,
  MapPin,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { AppText, Screen } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import { getInitials } from '@/src/utils/profile-formatters';
import {
  buildMyProfileViewModel,
  GENDER_OPTIONS,
  type KeyValueField,
} from '@/src/features/profile/myProfileViewModel';
import { usePersonalDetails } from '@/src/hooks/usePersonalDetails';
import { DeveloperSettingsSection } from '@/src/features/profile/DeveloperSettingsSection';

const FILLED_BG = '#FECA420F';
const ICON_BG = '#FECA421F';

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Icon size={14} color={colors.primary.main} />
      </View>
      <AppText style={styles.sectionTitle} variant="body" weight='semiBold'>{title}</AppText>
    </View>
  );
}

function ValueField({ label, value }: KeyValueField) {
  return (
    <View style={styles.fieldBlock}>
      <AppText style={styles.fieldLabel} variant="caption" weight='regular'>{label}</AppText>
      <View style={styles.filledBox}>
        <AppText style={styles.filledValue} variant="caption" weight='regular'>{value}</AppText>
      </View>
    </View>
  );
}

export default function MyProfileScreen() {
  const { personalDetails, isFetching } = usePersonalDetails(true);

  const viewModel = useMemo(
    () => buildMyProfileViewModel(personalDetails),
    [personalDetails],
  );

  // Show a full-screen loader on first load (no cached data yet).
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

  const initials = getInitials(viewModel.fullName || 'User');

  return (
    <Screen scroll={false} edges={[]} style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <AppText style={styles.avatarText}>{initials}</AppText>
            </View>
          </View>
          {viewModel.fullName ? (
            <AppText style={styles.nameText}>{viewModel.fullName}</AppText>
          ) : null}
        </View>

        <View style={styles.divider} />

        {viewModel.basicFields.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader icon={User} title="Basic Details" />
            <View style={styles.basicRows}>
              {viewModel.basicFields.map((field) => (
                <View key={field.label} style={styles.basicRow}>
                  <AppText style={styles.basicLabel} variant="caption" weight='regular'>{field.label}</AppText>
                  <AppText style={styles.basicValue} variant="caption" weight='regular'>{field.value}</AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {viewModel.personalFields.length > 0 || viewModel.dobParts || viewModel.genderLabel ? (
          <View style={styles.section}>
            <SectionHeader icon={FileText} title="Personal Information" />

            {viewModel.personalFields.map((field) => (
              <ValueField key={field.label} label={field.label} value={field.value} />
            ))}

            {viewModel.dobParts ? (
              <View style={styles.fieldBlock}>
                <AppText style={styles.fieldLabel} variant="caption" weight='regular'>Date of Birth</AppText>
                <View style={styles.dobRow}>
                  <View style={styles.dobBox}>
                    <AppText style={styles.dobLabel} variant="caption" weight='regular'>Day</AppText>
                    <AppText style={styles.dobValue} variant="caption" weight='regular'>{viewModel.dobParts.day}</AppText >
                  </View>
                  <View style={styles.dobBox}>
                    <AppText style={styles.dobLabel} variant="caption" weight='regular'>Month</AppText>
                    <AppText style={styles.dobValue} variant="caption" weight='regular'>{viewModel.dobParts.month}</AppText>
                  </View>
                  <View style={styles.dobBox}>
                    <AppText style={styles.dobLabel} variant="caption" weight='regular'>Year</AppText>
                    <AppText style={styles.dobValue} variant="caption" weight='regular'>{viewModel.dobParts.year}</AppText>
                  </View>
                </View>
              </View>
            ) : null}

            {viewModel.gender ? (
              <View style={styles.fieldBlock}>
                <AppText style={styles.fieldLabel} variant="caption" weight='regular'>Gender</AppText>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((option) => {
                    const isActive = option.key === viewModel.gender;
                    return (
                      <View
                        key={option.key}
                        style={[styles.genderPill, isActive && styles.genderPillActive]}
                      >
                        <AppText
                          style={[
                            styles.genderPillText,
                            isActive && styles.genderPillTextActive,
                          ]}
                          variant="caption"
                          weight='regular'
                        >
                          {option.label}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : viewModel.genderLabel ? (
              <ValueField label="Gender" value={viewModel.genderLabel} />
            ) : null}
          </View>
        ) : null}

        {viewModel.residenceFields.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader icon={MapPin} title="Residence Address" />
            {viewModel.residenceFields.map((field) => (
              <ValueField key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
        ) : null}

        {viewModel.employmentFields.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader icon={Briefcase} title="Employment Details" />
            {viewModel.employmentFields.map((field) => (
              <ValueField key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
        ) : null}

        <DeveloperSettingsSection />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
  },
  avatarText: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  nameText: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.main,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ICON_BG,
    marginRight: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  basicRows: {
    gap: spacing.base,
  },
  basicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  basicLabel: {
    fontFamily: typography.fontFamily.regular,
    color: colors.text.secondary,
    flex: 1,
  },
  basicValue: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    textAlign: 'right',
    flex: 1,
  },
  fieldBlock: {
    marginBottom: spacing.base,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  filledBox: {
    borderRadius: radius.md,
    backgroundColor: FILLED_BG,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  filledValue: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  dobRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dobBox: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: FILLED_BG,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dobLabel: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dobValue: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderPill: {
    flex: 1,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FILLED_BG,
    paddingHorizontal: spacing.sm,
  },
  genderPillActive: {
    backgroundColor: colors.primary.main,
  },
  genderPillText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  genderPillTextActive: {
    color: colors.text.inverse,
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

import React from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { FileText, type LucideIcon } from 'lucide-react-native';
import { AppText } from '@/src/components';
import { envConfig } from '@/src/config/envConfig';
import { colors, spacing, radius, typography } from '@/src/theme';
import { useDeveloperSettingsToggles } from '@/src/hooks/useDeveloperSettingsToggles';
import { STAGING_API_OVERRIDE } from '@/src/services/devToggles/apiBaseUrlResolver';

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
      <AppText style={styles.sectionTitle} variant="body" weight="semiBold">
        {title}
      </AppText>
    </View>
  );
}

function DevToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.basicRow}>
      <AppText style={styles.basicLabel} variant="caption" weight="regular">
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border.main, true: colors.primary.main }}
        thumbColor={colors.primary.main}
      />
    </View>
  );
}

export const DeveloperSettingsSection = () => {
  const {
    useNgrokApiBaseUrl,
    useAmanNgrokApiBaseUrl,
    useAdityaNgrokApiBaseUrl,
    useBankStatementUploader,
    stagingApiOverride,
    handleToggleNgrokBaseUrl,
    handleToggleAmanNgrokBaseUrl,
    handleToggleAdityaNgrokBaseUrl,
    handleToggleBankStatementUploader,
    handleToggleStaging2ApiBaseUrl,
    handleToggleStagingApiV1BaseUrl,
  } = useDeveloperSettingsToggles();

  if (!envConfig.isDevelopment) {
    return null;
  }

  return (
    <>
      <View style={styles.divider} />
      <View style={styles.section}>
        <SectionHeader icon={FileText} title="Developer Settings" />
        <View style={styles.basicRows}>
          <DevToggleRow
            label="Use ngrok API base URL"
            value={useNgrokApiBaseUrl}
            onValueChange={handleToggleNgrokBaseUrl}
          />
          <DevToggleRow
            label="Use Aman ngrok url"
            value={useAmanNgrokApiBaseUrl}
            onValueChange={handleToggleAmanNgrokBaseUrl}
          />
          <DevToggleRow
            label="Use Aditya ngrok URL"
            value={useAdityaNgrokApiBaseUrl}
            onValueChange={handleToggleAdityaNgrokBaseUrl}
          />
          <DevToggleRow
            label="Use staging2 API base URL"
            value={stagingApiOverride === STAGING_API_OVERRIDE.staging2}
            onValueChange={handleToggleStaging2ApiBaseUrl}
          />
          <DevToggleRow
            label="Use staging API base URL (/api/v1)"
            value={stagingApiOverride === STAGING_API_OVERRIDE.staging}
            onValueChange={handleToggleStagingApiV1BaseUrl}
          />
          <DevToggleRow
            label="Use manual bank statement upload"
            value={useBankStatementUploader}
            onValueChange={handleToggleBankStatementUploader}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
});

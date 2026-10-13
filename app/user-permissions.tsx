import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Screen, ListItemRow, Divider, PermissionStatusBadge, AppText } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import { usePermissions } from '@/src/hooks/usePermissions';
import { getAvailablePermissions, getPermissionIcon } from '@/src/services/permissions';
import type { PermissionType } from '@/src/types/permissions';

export default function PermissionsScreen() {
  // Get permissions available on current platform
  const availablePermissions = useMemo(() => getAvailablePermissions(), []);
  const permissionTypes = useMemo(
    () => availablePermissions.map((p) => p.id),
    [availablePermissions]
  );

  const { permissionStatuses, refreshPermissions } = usePermissions(permissionTypes);

  // Refresh permission statuses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshPermissions();
    }, [refreshPermissions])
  );

  const handlePermissionPress = useCallback(
    async (permissionId: PermissionType) => {
      // iOS ATT: first tap can show the system dialog when still undetermined; otherwise Settings.
      if (Platform.OS === 'ios' && permissionId === 'appTrackingTransparency') {
        const status = permissionStatuses[permissionId];
        if (status === 'undetermined') {
          try {
            const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
            await requestTrackingPermissionsAsync();
          } catch {
            // Old iOS / simulator edge cases — fall through to Settings.
          }
          await refreshPermissions();
          return;
        }
      }
      Linking.openSettings();
    },
    [permissionStatuses, refreshPermissions],
  );

  return (
    <Screen edges={[]}>
      <View style={styles.container}>
        <AppText style={styles.title} variant="bodyLarge" weight='semiBold'>App Permissions</AppText>
        <AppText style={styles.subtitle} variant="caption" weight='regular'>
          Manage app permissions from your device settings
        </AppText>

        <View style={styles.section}>
          {availablePermissions.map((permission, index) => {
            const status = permissionStatuses[permission.id] || 'undetermined';
            const isInfoOnlyPermission =
              permission.id === 'installedApps' ||
              permission.id === 'deviceMetadata';
            const effectiveStatus = isInfoOnlyPermission ? 'granted' : status;
            const isRowPressable = !isInfoOnlyPermission && effectiveStatus !== 'granted';

            return (
              <React.Fragment key={permission.id}>
                <ListItemRow
                  title={permission.title}
                  subtitle={permission.description}
                  icon={getPermissionIcon(permission.id)}
                  onPress={
                    isRowPressable ? () => void handlePermissionPress(permission.id) : undefined
                  }
                  rightElement={
                    <View style={styles.rightElementContainer}>
                      <PermissionStatusBadge status={effectiveStatus} />
                      {isRowPressable && (
                        <ChevronRight size={20} color={colors.text.tertiary} />
                      )}
                    </View>
                  }
                />
                {index < availablePermissions.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.infoContainer}>
          <AppText style={styles.infoText} variant="captionSmall" weight='regular'>
            Tap any pending permission to open device settings and manage it.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    // fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    // fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  infoContainer: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  infoText: {
    // fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  rightElementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

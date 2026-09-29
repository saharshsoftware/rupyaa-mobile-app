import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  FileText,
  Shield,
  Headphones,
  HelpCircle,
  Lock,
  Award,
  Bell,
  Bug,
  LogOut,
  ShieldAlert,
  Users,
  Languages,
  FileTextIcon,
  AlertCircleIcon,
} from 'lucide-react-native';
import { Screen, ConfirmationModal, AppText } from '@/src/components';
import { colors, spacing, typography, radius } from '@/src/theme';
import DeviceVersionInfo from '@/src/components/DeviceVersionInfo';
import { authService } from '@/src/services/auth/authService';
import { storageService } from '@/src/services/storage/storageService';
import { useUserDetailsStore } from '@/src/store/useUserDetailsStore';
import { getInitials } from '@/src/utils/profile-formatters';
import { clearPersonalDetailsCache } from '@/src/services/user/userService';
import { usePersonalDetails } from '@/src/hooks/usePersonalDetails';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { envConfig } from '@/src/config/envConfig';
import { getShowContacts } from '@/src/config/resolvedAppConfig';
import { useAppConfigStore } from '@/src/store/useAppConfigStore';

const ICON_SIZE = 20;
const AVATAR_SIZE = 64;

const actionCards = [
  {
    id: 'my-profile',
    title: 'My Profile',
    subtitle: 'Manage your personal details and preferences',
    icon: User,
    route: '/my-profile',
    type: 'link',
  },
  // {
  //   id: 'loan-agreement',
  //   title: 'Loan Agreement',
  //   subtitle: 'One stop collection of all your loan agreements',
  //   icon: FileText,
  //   route: '/account/loan-agreement',
  //   type: 'link',
  // },
];

const secondaryActions = [
  {
    id: 'my-profile',
    title: 'My Profile',
    subtitle: 'Manage your personal details and preferences',
    icon: User,
    route: '/my-profile',
    type: 'link',
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    icon: Shield,
    route: '/privacy',
  },
  {
    id: 'terms-of-service',
    title: 'Terms of Service',
    icon: Lock,
    route: '/terms',
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    route: '/faq',
  },
  {
    id: 'support',
    title: 'Support',
    icon: Headphones,
    route: '/support',
  },
  {
    id: 'lending-partners',
    title: 'Lending Partners',
    icon: Award,
    route: '/lending-partners',
  },
  {
    id: 'need-help',
    title: 'Raise a concern',
    icon: AlertCircleIcon,
    route: '/need-help',
  },
  {
    id: 'grievance-redressal-mechanism',
    title: 'Grievance Redressal Mechanism',
    icon: FileTextIcon,
    route: '/grievance-redressal-mechanism',
  },
  {
    id: 'grievance-redressal-policy',
    title: 'Grievance Redressal Policy',
    icon: FileText,  // we use different icon for this as it is a policy document
    route: '/grievance-redressal-policy',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    icon: ShieldAlert,
    route: '/user-permissions',
  },
  {
    id: 'language',
    title: 'Language',
    icon: Languages,
    route: '/language-selection',
  },
  // {
  //   id: 'hyper-kyc-face',
  //   title: 'Face Verification',
  //   icon: Camera,
  //   route: '/account/hyper-kyc-face',
  // },
] as const;

const debugSecondaryActions = [
//  {
//     id: 'network-logger',
//     title: 'Network Logger',
//     icon: Bug,
//     route: '/account/network-logger',
//   },
] as const;

const contactsMenuItem = {
  id: 'contacts',
  title: 'Refer',
  icon: Users,
  route: '/contacts',
} as const;

export default function AccountHome() {
  const router = useRouter();
  const { personalDetails } = usePersonalDetails();
  // Subscribe to app config so Contacts menu appears when config loads
  useAppConfigStore((s) => s.config);
  const showGoogleContacts = getShowContacts();


  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    setIsLoggingOut(true);

    try {

      await authService.logout();
      await storageService.clearAllAppStorage();
      // Clear personal details so the next session always fetches fresh data.
      clearPersonalDetailsCache();
    } catch {
      await storageService.clearAllAppStorage();
    } finally {

      setIsLoggingOut(false);
      router.replace('/auth/mobile-verification');
    }
  };

  const handleMenuItemPress = (route: string) => {
    router.push(route as Parameters<typeof router.push>[0]);
  };

  const displayName = personalDetails?.firstName ?? 'User';
  const displayContact = personalDetails?.phoneNumber ?? '';

  const renderActionsCards = () => {
    return (
      actionCards.map((item) => {
        const IconComponent = item.icon;

        if (item?.type != null && item?.type == 'toggle') {
          return (
            <View key={item.id} style={styles.actionCard}>
              <View style={styles.actionRow}>
                <View style={styles.actionIcon}>
                  <IconComponent size={ICON_SIZE} color={colors.primary.main} />
                </View>
                <View style={styles.actionText}>
                  <AppText style={styles.actionTitle}>{item.title}</AppText>
                  <AppText style={styles.actionSubtitle}>{item.subtitle}</AppText>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{
                    false: colors.border.main,
                    true: colors.primary.light,
                  }}
                  thumbColor={
                    notificationsEnabled
                      ? colors.primary.main
                      : colors.background.primary
                  }
                />
              </View>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.actionCard}
            onPress={() => handleMenuItemPress(item.route)}
            activeOpacity={0.7}
          >
            <View style={styles.actionRow}>
              <View style={styles.actionIcon}>
                <IconComponent size={ICON_SIZE} color={colors.primary.main} />
              </View>
              <View style={styles.actionText}>
                <AppText style={styles.actionTitle}>{item.title}</AppText>
                <AppText style={styles.actionSubtitle}>{item.subtitle}</AppText>
              </View>
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>
        );
      }))
  }

  const renderSecondaryActions = () => {
    const baseActions = showGoogleContacts
      ? [...secondaryActions, contactsMenuItem]
      : secondaryActions;
    const visibleActions = envConfig.isDevelopment
      ? [...baseActions, ...debugSecondaryActions]
      : baseActions;

    return visibleActions.map((item) => {
      const IconComponent = item.icon;

      return (
        <TouchableOpacity
          key={item.id}
          style={styles.secondaryRow}
          onPress={() => handleMenuItemPress(item.route)}
          activeOpacity={0.7}
        >
          <View style={styles.secondaryIcon}>
            <IconComponent size={ICON_SIZE} color={colors.primary.main} />
          </View>
          <AppText style={styles.secondaryTitle} variant="caption" color='textprimary' numberOfLines={1}>
            {item.title}
          </AppText>
          <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
      );
    })
  }

  return (
    <>
      <Screen
        edges={[]}
        contentContainerStyle={styles.scrollContent}
        style={styles.screen}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarInner}>
                <AppText style={styles.avatarText} numberOfLines={1}>
                  {getInitials(displayName)}
                </AppText>
              </View>
            </View>
            <View style={styles.profileInfo}>
              {displayName && <AppText style={styles.profileName} numberOfLines={1}>
                {displayName}
              </AppText>}
              {displayContact && <AppText style={styles.profileContact} numberOfLines={1}>
                {displayContact}
              </AppText>}
            </View>
          </View>
        </View>

        {/* <View style={styles.actionSection}>
          {renderActionsCards()}
        </View> */}

        <View style={styles.secondarySection}>
          {renderSecondaryActions()}
        </View>

        <TouchableOpacity
          style={[styles.secondaryRow, styles.logoutRow]}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.7}
          disabled={isLoggingOut}
        >
          <View style={[styles.secondaryIcon, styles.logoutIcon]}>
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.error.main} />
            ) : (
              <LogOut size={ICON_SIZE} color={colors.error.main} />
            )}
          </View>
          <AppText style={styles.logoutText}>Logout</AppText>
        </TouchableOpacity>

        <DeviceVersionInfo />
      </Screen>
      <ConfirmationModal
        visible={logoutModalVisible}
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        editLabel="Cancel"
        onConfirm={handleLogout}
        onEdit={() => setLogoutModalVisible(false)}
        confirmButtonVariant="danger"
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  profileCard: {
    // backgroundColor: colors.background.primary,
    // borderRadius: radius.xl,
    // borderWidth: 1,
    // borderColor: colors.border.light,
    // padding: spacing.base,
    marginBottom: spacing.xl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
    borderWidth: 2,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  avatarInner: {
    width: AVATAR_SIZE - 10,
    height: AVATAR_SIZE - 10,
    borderRadius: radius.full,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  profileContact: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  actionSection: {
    marginBottom: spacing.sm,
  },
  actionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primary.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  secondarySection: {
    // marginBottom: spacing.lg,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: colors.background.primary,
    // borderWidth: 1,
    // borderColor: colors.border.light,
    // borderRadius: radius.lg,
    // paddingHorizontal: spacing.base,
    // paddingVertical: spacing.sm,
    marginBottom: spacing.base,
  },
  secondaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primary.lightest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  secondaryTitle: {
    flex: 1,
    // fontSize: typography.fontSize.sm,
    // fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    minWidth: 0,
  },
  logoutRow: {
    borderColor: colors.error.bg,
    marginBottom: spacing.lg,
  },
  logoutIcon: {
    backgroundColor: colors.error.bg,
  },
  logoutText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.error.main,
  },
});

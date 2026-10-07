import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Share,
  Platform,
} from 'react-native';
import { Screen, AppText, Button, ZapcashLoading } from '@/src/components';
import ErrorContainer from '@/src/components/ErrorContainer';
import { colors, spacing, typography, radius } from '@/src/theme';
import { getPersonalDetails, getGoogleContacts } from '@/src/services/registration/registrationApi';
import { importGoogleContacts } from '@/src/services/registration/sanctionApi';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import type { GoogleContact } from '@/src/types';
import { appConfig } from '@/src/config/appConfig';

const AVATAR_COLORS = [
  colors.primary.main,
  colors.primary.dark,
  '#1565C0', // deep blue
  '#6A1B9A', // deep purple
  '#283593', // indigo
] as const;

function getContactListKey(item: GoogleContact, index: number): string {
  const id = item._id?.trim() ?? '';
  const name = item.name?.trim().toLowerCase() ?? '';
  const phone = item.phone?.trim() ?? '';
  const identity = id || `${name}|${phone}`;
  return `${identity}-${index}`;
}

function getAvatarColor(name: string | undefined): string {
  const safe = name?.trim();
  if (!safe) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < safe.length; i += 1) {
    hash = (hash + safe.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ContactCard({
  item,
  onSend,
}: {
  item: GoogleContact;
  onSend: (contact: GoogleContact) => void;
}) {
  const initial = item.name?.trim().charAt(0).toUpperCase() ?? '?';
  const avatarColor = getAvatarColor(item.name);

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <AppText style={styles.avatarText} numberOfLines={1}>
          {initial}
        </AppText>
      </View>
      <View style={styles.cardContent}>
        <AppText style={styles.name} numberOfLines={1}>
          {item.name}
        </AppText>
        {item.phone ? (
          <AppText style={styles.contactLine} numberOfLines={1}>
            {item.phone}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          title="Send"
          onPress={() => onSend(item)}
          variant="primary"
          size="small"
        />
      </View>
    </View>
  );
}

type OauthCheckStatus = 'loading' | 'not_done' | 'done' | 'error';
type ContactsFetchStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ContactsScreen() {
  const { promptAsync } = useGoogleAuth();
  const mountedRef = useRef(true);

  const [oauthCheckStatus, setOauthCheckStatus] = useState<OauthCheckStatus>('loading');
  const [oauthCheckError, setOauthCheckError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [contactsStatus, setContactsStatus] = useState<ContactsFetchStatus>('idle');
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [connectInProgress, setConnectInProgress] = useState(false);

  const getReferralMessage = useCallback(() => {
    const appName = appConfig.appName ?? 'Rupyaa';
    const storeUrl = Platform.OS === 'android' ? appConfig.playStoreUrl : appConfig.appStoreUrl;
    return `Hey! I'm using ${appName} for instant personal loans. Check it out here: ${storeUrl}`;
  }, []);

  const handleSend = useCallback(
    (contact: GoogleContact) => {
      const message = getReferralMessage();
      // In future we can customize per-contact if needed; for now it’s a generic referral.
      Share.share({ message }).catch(() => undefined);
    },
    [getReferralMessage],
  );

  const sortContactsByName = useCallback((list: GoogleContact[]): GoogleContact[] => {
    if (!Array.isArray(list) || list.length === 0) return [];
    // Sort by name (case-insensitive), fall back to phone when name missing.
    return [...list].sort((a, b) => {
      const nameA = a.name?.trim().toLowerCase() ?? '';
      const nameB = b.name?.trim().toLowerCase() ?? '';
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      }
      if (nameA) return -1;
      if (nameB) return 1;
      const phoneA = a.phone?.trim() ?? '';
      const phoneB = b.phone?.trim() ?? '';
      return phoneA.localeCompare(phoneB);
    });
  }, []);

  const loadPersonalDetails = useCallback(async () => {
    setOauthCheckStatus('loading');
    setOauthCheckError(null);
    const res = await getPersonalDetails();
    if (!mountedRef.current) return;
    if (!res.success) {
      setOauthCheckStatus('error');
      setOauthCheckError(res.error?.message ?? 'Failed to load');
      return;
    }
    const isOauthDone = res.data?.isOauthDone === true;
    setOauthCheckStatus(isOauthDone ? 'done' : 'not_done');
    if (isOauthDone) {
      setContactsStatus('loading');
      setContactsError(null);
      const contactsRes = await getGoogleContacts();
      if (!mountedRef.current) return;
      if (!contactsRes.success) {
        setContactsStatus('error');
        setContactsError(contactsRes.error?.message ?? 'Failed to load contacts');
        return;
      }
      const list = contactsRes.data?.contacts ?? [];
      setContacts(sortContactsByName(list));
      setContactsStatus('success');
    }
  }, [sortContactsByName]);

  useEffect(() => {
    mountedRef.current = true;
    loadPersonalDetails();
    return () => {
      mountedRef.current = false;
    };
  }, [loadPersonalDetails]);

  const handleConnectGoogle = useCallback(async () => {
    if (connectInProgress) return;
    setConnectInProgress(true);
    try {
      const result = await promptAsync();
      if (!mountedRef.current) return;
      if (result?.type === 'cancelled') {
        setConnectInProgress(false);
        return;
      }
      const accessToken = result && 'accessToken' in result ? result.accessToken : null;
      if (!accessToken) {
        if (mountedRef.current) setConnectInProgress(false);
        return;
      }
      const importRes = await importGoogleContacts(accessToken);
      if (!mountedRef.current) return;
      if (!importRes.success) {
        setOauthCheckError(importRes.error?.message ?? 'Failed to import contacts');
        setConnectInProgress(false);
        return;
      }
      await loadPersonalDetails();
    } finally {
      if (mountedRef.current) setConnectInProgress(false);
    }
  }, [promptAsync, loadPersonalDetails, connectInProgress]);

  const handleRetryOauthCheck = useCallback(() => {
    loadPersonalDetails();
  }, [loadPersonalDetails]);

  const fetchContacts = useCallback(async () => {
    setContactsStatus('loading');
    setContactsError(null);
    const res = await getGoogleContacts();
    if (!mountedRef.current) return;
    if (!res.success) {
      setContactsStatus('error');
      setContactsError(res.error?.message ?? 'Failed to load contacts');
      return;
    }
    const list = res.data?.contacts ?? [];
    setContacts(sortContactsByName(list));
    setContactsStatus('success');
  }, [sortContactsByName]);

  const renderItem: ListRenderItem<GoogleContact> = useCallback(
    ({ item }) => (
      <ContactCard
        item={item}
        onSend={handleSend}
      />
    ),
    [handleSend],
  );
  const keyExtractor = useCallback(
    (item: GoogleContact, index: number) => getContactListKey(item, index),
    [],
  );

  if (oauthCheckStatus === 'loading') {
    return (
      <Screen scroll={false} edges={[]} contentContainerStyle={styles.centered}>
        <ZapcashLoading visible title="Loading..." />
      </Screen>
    );
  }

  if (oauthCheckStatus === 'error') {
    return (
      <Screen scroll={false} edges={[]} contentContainerStyle={styles.centered}>
        <ErrorContainer responseError={oauthCheckError ?? 'Something went wrong'} />
        <Button
          title="Try again"
          onPress={handleRetryOauthCheck}
          style={styles.retryButton}
        />
      </Screen>
    );
  }

  if (oauthCheckStatus === 'not_done') {
    return (
      <Screen scroll={false} edges={[]} contentContainerStyle={styles.centered}>
        <AppText variant='caption' color='tertiary' style={styles.connectMessage}>
          Connect your Google account to view contacts
        </AppText>
        <Button
          title="Connect Google Account"
          onPress={handleConnectGoogle}
          loading={connectInProgress}
          disabled={connectInProgress}
          style={styles.connectButton}
        />
        {oauthCheckError ? (
          <ErrorContainer responseError={oauthCheckError} />
        ) : null}
      </Screen>
    );
  }

  if (contactsStatus === 'loading') {
    return (
      <Screen scroll={false} edges={[]} contentContainerStyle={styles.centered}>
        <ZapcashLoading visible={true} />
      </Screen>
    );
  }

  if (contactsStatus === 'error') {
    return (
      <Screen scroll={false} edges={[]} contentContainerStyle={styles.centered}>
        <ErrorContainer responseError={contactsError ?? 'Failed to load contacts'} />
        <Button title="Try again" onPress={fetchContacts} style={styles.retryButton} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={[]}>
      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant='captionSmall' weight='regular' color='textprimary' style={styles.headerTitle}>
            Invite your friends to try the app. When they sign up and complete their first action, you both earn rewards!
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText style={styles.emptyText}>No contacts</AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    color: colors.text.primary,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.sm,
    marginBottom: spacing.base,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.inverse,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  iconButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sendText: {
    color: colors.primary.main,
  },
  name: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  contactLine: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  empty: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  connectMessage: {
    // fontSize: typography.fontSize.base,
    // color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  connectButton: {
    marginBottom: spacing.base,
  },
  retryButton: {
    marginTop: spacing.base,
  },
});

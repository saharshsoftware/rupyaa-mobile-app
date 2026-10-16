import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { appConfig } from '@/src/config/appConfig';
import { colors, spacing } from '@/src/theme';
import { resolveWhatsAppUrl } from '@/src/utils/common-helper';
import { prepareLoanJourneySupport } from '@/src/services/support';
import { AppText } from './AppText';

function ContactSupport() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpening, setIsOpening] = useState(false);
  const isMounted = useRef(true);
  const openingRef = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handlePress = () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setIsOpening(true);
    if (pathname === '/loan-journey') {
      void prepareLoanJourneySupport().then(prefillId => {
        if (isMounted.current) {
          router.push({ pathname: '/need-help', params: { source: 'loan-journey', prefillId } });
        }
      }).catch(() => {
        if (isMounted.current) Alert.alert('Contact Support', appConfig.contactSupportTeamEmail);
      }).finally(() => {
        openingRef.current = false;
        if (isMounted.current) setIsOpening(false);
      });
      return;
    }
    void Linking.openURL(resolveWhatsAppUrl() ?? appConfig.supportUrl).catch(() => {
      if (isMounted.current) Alert.alert('Contact Support', appConfig.contactSupportTeamEmail);
    }).finally(() => {
      openingRef.current = false;
      if (isMounted.current) setIsOpening(false);
    });
  };

  return (
    <View style={styles.container}>
      <AppText variant="caption" color="textprimary">Need help?</AppText>
      <Pressable
        onPress={handlePress}
        disabled={isOpening}
        accessibilityState={{ disabled: isOpening }}
        accessibilityRole="link"
        accessibilityLabel="Contact Support"
        style={styles.link}
      >
        <AppText variant="caption" weight="semiBold" color="primary" style={styles.linkText}>
          {isOpening && pathname === '/loan-journey' ? 'Attaching screen...' : 'Contact Support'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    flexShrink: 0,
  },
  link: {
    minHeight: spacing['3xl'] + spacing.xs,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  linkText: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary.main,
    textAlign: 'center',
  },
});

export { ContactSupport };

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { appConfig } from '@/src/config/appConfig';
import { colors, spacing } from '@/src/theme';
import { resolveWhatsAppUrl } from '@/src/utils/common-helper';
import { AppText } from './AppText';

function ContactSupport() {
  const [isOpening, setIsOpening] = useState(false);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const handlePress = () => {
    if (isOpening) return;
    setIsOpening(true);
    void Linking.openURL(resolveWhatsAppUrl() ?? appConfig.supportUrl).catch(() => {
      if (isMounted.current) Alert.alert('Contact Support', appConfig.contactSupportTeamEmail);
    }).finally(() => {
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
          Contact Support
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

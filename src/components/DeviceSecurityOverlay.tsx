import React from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

import { useDeviceSecurityBlock } from '@/src/hooks/useDeviceSecurityBlock';
import { exitApp, resetDeviceSecuritySession } from '@/src/services/security';
import { SecurityNoticeScreen } from './SecurityNoticeScreen';

/**
 * Root-level full-screen gate when device security threats are active.
 * Sits above the entire navigation stack so tabs and routes cannot be used.
 */
export const DeviceSecurityOverlay = () => {
  const { isBlocked, message } = useDeviceSecurityBlock();

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal
      visible={isBlocked}
      animationType="fade"
      statusBarTranslucent
      transparent={false}
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <SecurityNoticeScreen
          message={message}
          onOkayPress={exitApp}
          // secondaryActionLabel={__DEV__ ? 'Reset (dev)' : undefined}
          // onSecondaryActionPress={__DEV__ ? resetDeviceSecuritySession : undefined}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

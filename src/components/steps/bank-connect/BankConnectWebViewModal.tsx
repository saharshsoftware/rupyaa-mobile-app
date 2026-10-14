import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { BankStatementSuccessPayload } from '@/src/types/webview';
import { BankConnectWebView } from '@/src/components/BankConnectWebView';
import { ContactSupport } from '../../ContactSupport';
import { FullScreenModal } from '@/src/components/FullScreenModal';
import ErrorContainer from '@/src/components/ErrorContainer';

type BankConnectWebViewModalProps = {
  visible: boolean;
  tempUrl: string | null;
  onClose: () => void;
  onBankStatementSuccess: (payload: BankStatementSuccessPayload) => void;
};

export function BankConnectWebViewModal({
  visible,
  tempUrl,
  onClose,
  onBankStatementSuccess,
}: BankConnectWebViewModalProps): React.JSX.Element {
  return (
    <FullScreenModal
      footer={<ContactSupport />}
      visible={visible}
      onClose={onClose}
      title="Bank Connect"
      subtitle="Complete your bank verification"
      disableContentPadding={true}
    >
      <View style={styles.webViewContainer}>
        {tempUrl ? (
          <BankConnectWebView
            url={tempUrl}
            style={styles.webView}
            onBankStatementSuccess={onBankStatementSuccess}
          />
        ) : (
          <ErrorContainer responseError="Unable to open bank connect link. Please try again." />
        )}
      </View>
    </FullScreenModal>
  );
}

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});

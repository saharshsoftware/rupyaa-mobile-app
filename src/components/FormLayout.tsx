import React, { ReactNode, forwardRef, useImperativeHandle, useRef } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  type StyleProp,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-aware-scroll-view";
import { colors, spacing } from "@/src/theme";
import { useKeyboardHeight } from "@/src/hooks/useKeyboardHeight";

import { ContactSupport } from "./ContactSupport";

export interface FormLayoutProps {
  showContactSupport?: boolean;
  children: ReactNode;
  /** Pass null to hide the fixed footer strip entirely. */
  footer?: ReactNode | null;
  /** Renders inside scroll view (scrolls with content) */
  header?: ReactNode;
  /** Renders above scroll view (fixed at top, does not scroll) */
  fixedHeader?: ReactNode;

  /** Show back button below fixed header; requires onBack handler */
  showBackButton?: boolean;
  onBack?: () => void;

  contentContainerStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;

  scrollEnabled?: boolean;
  showFooterBorder?: boolean;
  /** When true, lifts footer above keyboard automatically. */
  keyboardAwareFooter?: boolean;

  scrollViewProps?: Omit<KeyboardAwareScrollViewProps, "contentContainerStyle">;

  /** Extra scroll push when keyboard is open */
  extraScrollHeight?: number;

  /**
   * Safe area edges for the root SafeAreaView.
   * Default: ["top", "bottom"].
   * Pass ["bottom"] when a parent (e.g. LoanWizard) already handles the top inset.
   */
  safeAreaEdges?: readonly Edge[];
}

const FOOTER_PADDING_VERTICAL = spacing.md;

export const FormLayout = forwardRef<KeyboardAwareScrollView, FormLayoutProps>(
  function FormLayout(
    {
      children,
      showContactSupport = false,
      footer,
      header,
      fixedHeader,
      showBackButton = false,
      onBack,
      contentContainerStyle,
      footerStyle,
      scrollEnabled = true,
      showFooterBorder = false,
      keyboardAwareFooter = false,
      scrollViewProps,
      extraScrollHeight = 16,
      safeAreaEdges = ["top", "bottom"],
    },
    ref
  ) {
    const internalRef = useRef<KeyboardAwareScrollView>(null);

    // footer lifts itself when keyboardAwareFooter=true
    const keyboardHeight = useKeyboardHeight(keyboardAwareFooter);

    const footerPaddingBottom =
      keyboardAwareFooter && keyboardHeight > 0
        ? keyboardHeight + FOOTER_PADDING_VERTICAL
        : FOOTER_PADDING_VERTICAL;

    // Android already resizes the window for the keyboard. The library's
    // automatic-scroll path can retain a stale native input tag while a wizard
    // step unmounts, which triggers viewIsDescendantOf warnings in bridgeless mode.
    const shouldAutoScroll = Platform.OS === "ios" && !keyboardAwareFooter;

    useImperativeHandle(
      ref,
      () => internalRef.current as KeyboardAwareScrollView
    );

    return (
      <SafeAreaView style={styles.container} edges={safeAreaEdges}>
        {fixedHeader ? (
          <View style={styles.fixedHeader}>{fixedHeader}</View>
        ) : null}

        {showBackButton && onBack ? (
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <ChevronLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inner}>
          <KeyboardAwareScrollView
            ref={internalRef}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            scrollEnabled={scrollEnabled}
            enableOnAndroid
            enableResetScrollToCoords={false}
            enableAutomaticScroll={shouldAutoScroll}
            extraScrollHeight={shouldAutoScroll ? extraScrollHeight : 0}
            {...scrollViewProps}
          >
            {header}
            {children}
          </KeyboardAwareScrollView>

          {footer != null || showContactSupport ? (
            <View
              style={[
                styles.footer,
                showFooterBorder && styles.footerBorder,
                { paddingBottom: footerPaddingBottom },
                footerStyle,
              ]}
            >
              {showContactSupport && <ContactSupport />}
              {footer}
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.transparent,
  },
  fixedHeader: {
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.transparent,
  },
  backButtonContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.transparent,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  inner: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    // NOTE: keep this; if you still see extra blank area, comment it once and test
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop: FOOTER_PADDING_VERTICAL,
    backgroundColor: colors.transparent,
  },
  footerBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

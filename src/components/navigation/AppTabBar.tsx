import React, { useContext, useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  DocumentValidationIcon,
  Home03Icon,
  MoneyBag01Icon,
  User02Icon,
} from '@hugeicons/core-free-icons';
import { AppText } from '@/src/components/AppText';
import { colors, radius, spacing, typography } from '@/src/theme';

const TAB_BAR_HEIGHT = 58;
const TAB_ICON_SIZE = 18;

const TAB_ICONS: Record<string, typeof Home03Icon> = {
  home: Home03Icon,
  'my-loan': MoneyBag01Icon,
  documents: DocumentValidationIcon,
  account: User02Icon,
};

export function AppTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const setTabBarHeight = useContext(BottomTabBarHeightCallbackContext);
  const bottomOffset = Math.max(insets.bottom, spacing.xs);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setTabBarHeight?.(isKeyboardVisible ? 0 : TAB_BAR_HEIGHT + bottomOffset);
  }, [bottomOffset, isKeyboardVisible, setTabBarHeight]);

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View
      style={[styles.wrapper, { marginBottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            typeof options.title === 'string' && options.title.length > 0
              ? options.title
              : route.name;
          const icon = TAB_ICONS[route.name];
          const badge = options.tabBarBadge;
          const showBadge = badge !== undefined;

          const onPress = (): void => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = (): void => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabPressable}
            >
              <View style={[styles.tabContent, isFocused && styles.tabContentActive]}>
                {isFocused && icon ? (
                  <View style={styles.iconWrap}>
                    <HugeiconsIcon
                      icon={icon}
                      size={TAB_ICON_SIZE}
                      color={colors.text.black}
                    />
                  </View>
                ) : null}
                <AppText
                  weight={isFocused ? 'semiBold' : 'medium'}
                  style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}
                >
                  {label}
                </AppText>
                {showBadge ? (
                  <View style={styles.badge}>
                    {typeof badge === 'number' || typeof badge === 'string' ? (
                      <AppText style={styles.badgeText} weight="semiBold">
                        {badge}
                      </AppText>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
  },
  tabPressable: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  tabContentActive: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.base,
    paddingVertical: 6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: typography.fontSize.xs,
    lineHeight: typography.fontSize.xs * typography.lineHeight.tight,
    flexShrink: 0,
  },
  labelActive: {
    color: colors.text.black,
  },
  labelInactive: {
    color: colors.text.tertiary,
  },
  badge: {
    minWidth: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.error.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 8,
    lineHeight: 10,
  },
});

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@/src/theme';

const RAY_COUNT = 8;

export interface AnimatedLoaderProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedLoader({
  size = 64,
  color = colors.primary.main,
  style,
}: AnimatedLoaderProps): React.JSX.Element {
  const rotation = useRef(new Animated.Value(0)).current;
  const rays = useMemo(() => Array.from({ length: RAY_COUNT }, (_, index) => index), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const rayWidth = Math.max(3, size * 0.11);
  const rayHeight = size * 0.29;
  const rayOffset = size * 0.04;
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.container, { width: size, height: size, transform: [{ rotate: spin }] }, style]}
    >
      {rays.map((ray) => (
        <View
          key={ray}
          style={[
            styles.rayPosition,
            {
              transform: [{ rotate: `${ray * (360 / RAY_COUNT)}deg` }],
            },
          ]}
        >
          <View
            style={{
              width: rayWidth,
              height: rayHeight,
              marginTop: rayOffset,
              borderRadius: rayWidth / 2,
              backgroundColor: color,
              opacity: 0.35 + ray * 0.08,
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rayPosition: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
});

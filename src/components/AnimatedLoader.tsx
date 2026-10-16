import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/src/theme';

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

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
      style={[styles.container, { width: size, height: size }, style]}
    >
      <Animated.View
        style={[styles.ring, { transform: [{ rotate: spin }] }]}
      >
        <Svg width={size} height={size} viewBox="-12 -12 120 120" fill="none">
          <Circle cx={48} cy={48} r={43} stroke={color} strokeWidth={5} opacity={0.2} />
          <Path
            d="M48 5a43 43 0 0 1 43 43"
            stroke={color}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      {/* Inline favicon.svg artwork keeps the mark crisp at every loader size. */}
      <Svg width={size} height={size} viewBox="-12 -12 120 120" fill={color}>
        <Circle cx={30} cy={27} r={5} />
        <Circle cx={66} cy={27} r={5} />
        <Path d="M24 39h12v12c0 8 4 12 12 12s12-4 12-12V39h12v12c0 15-9 23-24 23S24 66 24 51Z" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

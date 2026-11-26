/**
 * StepCircle - Circle indicator for a single step in the progress stepper.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/src/theme';

const CIRCLE_SIZE = 20;

export interface StepCircleProps {
  showCheck: boolean;
  active: boolean;
  size?: number;
  accentColor?: string;
}

export function StepCircle({
  showCheck,
  active,
  size = CIRCLE_SIZE,
  accentColor = colors.primary.main,
}: StepCircleProps) {
  const isCompleted = showCheck;
  const isCurrent = active && !isCompleted;
  const status = isCompleted ? 'Completed' : isCurrent ? 'In progress' : 'Upcoming';
  const indicator = isCompleted
    ? <Check size={14} color={colors.text.inverse} strokeWidth={3} />
    : isCurrent && <View style={[styles.currentDot, { backgroundColor: accentColor }]} />;

  return (
    <View
      accessible
      accessibilityLabel={status}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accentColor,
          backgroundColor: isCompleted ? accentColor : colors.background.primary,
        },
        isCurrent && styles.circleActive,
      ]}
    >
      {indicator}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.primary.main,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: {
    borderWidth: 2.5,
  },
  currentDot: {
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE / 2,
    borderRadius: CIRCLE_SIZE / 4,
  },
});

/**
 * ProgressStepperV2 - Alternative progress indicator using react-native-step-indicator.
 * Same API as ProgressStepper for easy comparison. Toggle via appConfig.useProgressStepperV2.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import StepIndicator from 'react-native-step-indicator';
import { StepCircle } from './StepCircle';
import { colors, spacing, typography } from '@/src/theme';
import { AppText } from '../AppText';
import { getStepperVisualStates } from '@/src/utils/progressStepperUtils';
import type { StepItem } from '@/src/utils/progressStepperUtils';
import type { FlowPhase } from '@/src/config/flowSteps';

// ============================================================================
// Types
// ============================================================================

export interface ProgressStepperV2Props {
  /** Array of steps to display */
  steps: readonly StepItem[];
  /** Current active step index (0-based) */
  currentStep: number;
  /** Progress within current step (0 to 1). Optional, defaults to 0 */
  progress?: number;
  /** Record of passed phases: { register: true, offer: false, ... } */
  passedPhases?: Record<FlowPhase, boolean>;
  /** Record of passed substeps: { "register:0": true, "offer:1": true, ... } */
  passedSubsteps?: Record<string, boolean>;
  /** Current active substep index within the current phase (0-based). Optional */
  currentSubstepIndex?: number;
  /** Total substeps in the current phase. Optional, not displayed in V2 (four steps only). */
  totalSubstepsInCurrentPhase?: number;
  /** Label of the current substep. Optional, not displayed in V2 (four steps only). */
  currentSubstepLabel?: string;
  /** Number of lines for step labels. Defaults to 1. */
  numberOfLines?: number;
  accentColor?: string;
}

const STEP_SIZE = 22;

// ============================================================================
// Custom styles to match theme (V1 look)
// ============================================================================

function buildCustomStyles(stepSize: number, accentColor: string) {
  return {
    stepIndicatorSize: stepSize,
    currentStepIndicatorSize: stepSize,
    separatorStrokeWidth: 2,
    stepStrokeWidth: 2,
    currentStepStrokeWidth: 2.5,
    stepStrokeCurrentColor: accentColor,
    stepStrokeFinishedColor: accentColor,
    stepStrokeUnFinishedColor: accentColor,
    separatorFinishedColor: accentColor,
    separatorUnFinishedColor: accentColor,
    stepIndicatorFinishedColor: accentColor,
    stepIndicatorUnFinishedColor: colors.background.primary,
    stepIndicatorCurrentColor: colors.background.primary,
    stepIndicatorLabelFontSize: 0,
    currentStepIndicatorLabelFontSize: 0,
    stepIndicatorLabelCurrentColor: colors.primary.contrast,
    stepIndicatorLabelFinishedColor: colors.primary.contrast,
    stepIndicatorLabelUnFinishedColor: colors.text.primary,
    labelColor: colors.text.primary,
    currentStepLabelColor: colors.text.black,
    labelSize: typography.fontSize.xs,
    labelAlign: 'center' as const,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function ProgressStepperV2({
  steps,
  currentStep,
  progress = 0,
  passedPhases,
  passedSubsteps,
  currentSubstepIndex = 0,
  numberOfLines = 1,
  accentColor = colors.primary.main,
}: ProgressStepperV2Props) {
  if (!steps.length) return null;

  const stepStates = getStepperVisualStates({
    steps,
    currentStep,
    progress,
    passedPhases,
    passedSubsteps,
    currentSubstepIndex,
    logMode: 'issues-only',
  });

  const labels = steps.map((s) => s.label);
  const customStyles = buildCustomStyles(STEP_SIZE, accentColor);

  const renderStepIndicator = ({
    position,
  }: {
    position: number;
    stepStatus: string;
  }) => {
    const state = stepStates[position];
    if (!state) return null;
    return (
      <StepCircle
        showCheck={state.showsCheck}
        active={state.isActive}
        size={STEP_SIZE}
        accentColor={accentColor}
      />
    );
  };

  const renderLabel = (args: {
    position: number;
    stepStatus: string;
    label: string;
    currentPosition: number;
  }) => {
    const isActive = args.position === currentStep;
    return (
      <View style={styles.labelWrap}>
        <AppText
          style={[styles.labelText, isActive && styles.labelTextActive]}
          numberOfLines={numberOfLines}
        >
          {args.label}
        </AppText>
      </View>
    );
  };

  return (
    <View style={styles.container} accessibilityLabel="Progress steps">
      <StepIndicator
        currentPosition={currentStep}
        stepCount={steps.length}
        direction="horizontal"
        customStyles={customStyles}
        labels={labels}
        renderStepIndicator={renderStepIndicator}
        renderLabel={renderLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.base,
  },
  labelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  labelTextActive: {
    color: colors.text.black,
    fontWeight: '700',
  },
});

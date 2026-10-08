import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFlowStore } from '@/src/store/useFlowStore';
import { useDevSimulationStore, type SimulatedStepState } from '@/src/store/useDevSimulationStore';
import { FLOW_CONFIG, FLOW_PHASES, getSubstepCount } from '@/src/config/flowSteps';
import { colors, spacing, typography } from '@/src/theme';
import { AppText } from './AppText';

const SIM_STATES: { key: SimulatedStepState; label: string }[] = [
  { key: 'loading', label: 'Loading' },
  { key: 'success', label: 'Success' },
  { key: 'error', label: 'Error' },
];

/**
 * Dev-only floating toolbar to simulate step UI states (loading/success/error).
 * Renders only in __DEV__. Auto-clears simulation when step changes.
 */
export function DevStepToolbar() {
  return __DEV__ ? <DevStepToolbarContent /> : null;
}

function DevStepToolbarContent() {

  const phaseIndex = useFlowStore((s) => s.phaseIndex);
  const substepIndex = useFlowStore((s) => s.substepIndex);
  const next = useFlowStore((s) => s.next);
  const setSkipNextUserStageSync = useFlowStore((s) => s.setSkipNextUserStageSync);
  const simulatedState = useDevSimulationStore((s) => s.simulatedState);
  const setSimulatedState = useDevSimulationStore((s) => s.setSimulatedState);
  const clearSimulation = useDevSimulationStore((s) => s.clearSimulation);

  const [collapsed, setCollapsed] = useState(true);

  const safePhaseIndex = Math.max(0, Math.min(phaseIndex, FLOW_PHASES.length - 1));
  const currentPhase = FLOW_PHASES[safePhaseIndex];
  const phaseConfig = FLOW_CONFIG[currentPhase];
  const totalSubsteps = getSubstepCount(currentPhase);
  const safeSubstepIndex = Math.max(0, Math.min(substepIndex, Math.max(totalSubsteps - 1, 0)));
  const currentSubstep = phaseConfig.substeps[safeSubstepIndex];
  const stepLabel = currentSubstep?.label ?? '—';

  // Clear simulation when user navigates to a different step
  useEffect(() => {
    clearSimulation();
  }, [phaseIndex, substepIndex, clearSimulation]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.8}
        accessibilityLabel={collapsed ? 'Expand step simulator' : 'Collapse step simulator'}
      >
        <AppText style={styles.toggleText}>
          {collapsed ? 'Step sim' : 'Step sim ▼'}
        </AppText>
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.panel}>
          <AppText style={styles.stepName} numberOfLines={1}>
            {stepLabel}
          </AppText>
          <TouchableOpacity
            style={[styles.stateButton, styles.nextButton]}
            onPress={() => {
              setSkipNextUserStageSync(true);
              next();
            }}
            activeOpacity={0.8}
            accessibilityLabel="Go to next step"
          >
            <AppText style={styles.stateButtonText}>Next step</AppText>
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            {SIM_STATES.map(({ key, label }) => {
              const isActive = simulatedState === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.stateButton, isActive && styles.stateButtonActive]}
                  onPress={() => setSimulatedState(key)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Simulate ${label}`}
                >
                  <AppText
                    style={[styles.stateButtonText, isActive && styles.stateButtonTextActive]}
                    numberOfLines={1}
                  >
                    {label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.stateButton,
                simulatedState === null && styles.stateButtonActive,
              ]}
              onPress={clearSimulation}
              activeOpacity={0.8}
              accessibilityLabel="Reset simulation"
            >
              <AppText
                style={[
                  styles.stateButtonText,
                  simulatedState === null && styles.stateButtonTextActive,
                ]}
              >
                Reset
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    right: 24,
    alignItems: 'flex-end',
  },
  toggleButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  toggleText: {
    color: colors.primary.contrast,
    fontSize: 11,
    fontFamily: typography.fontFamily.semiBold,
  },
  panel: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.sm,
    minWidth: 160,
    maxWidth: 240,
  },
  stepName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  stateButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  nextButton: {
    marginBottom: spacing.sm,
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.lightest,
  },
  stateButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.info.bg,
  },
  stateButtonText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  stateButtonTextActive: {
    color: colors.primary.main,
  },
});

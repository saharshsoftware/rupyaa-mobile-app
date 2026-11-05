/**
 * Progress Stepper Utilities (refined)
 *
 * Key rules:
 * - Each connector represents progress THROUGH a step (phase).
 * - Connector AFTER step i is filled/partial based on step i progress/completion.
 * - Step completion can happen either:
 *    a) phase passed flag
 *    b) all substeps passed
 *    c) moved past the phase (currentStep > index)
 */

import type { FlowPhase } from '@/src/config/flowSteps';
import { FLOW_PHASES, getSubstepCount } from '@/src/config/flowSteps';

// ============================================================================
// Types
// ============================================================================

export interface StepItem {
  id: string;
  label: string;
}

export type StepperDebugMode = 'always' | 'issues-only';

export interface StepperVisualState {
  isActive: boolean;
  showsCheck: boolean;

  leftFilled: boolean;
  leftPartial?: number; // 0..1

  rightFilled: boolean;
  rightPartial?: number; // 0..1

  highlighted: boolean;
}

export interface StepperStateInput {
  steps: readonly StepItem[];
  currentStep: number;

  /**
   * Optional fallback progress within current step (0..1).
   * Used only when we can't derive from substeps.
   */
  progress: number;

  passedPhases?: Record<FlowPhase, boolean>;
  passedSubsteps?: Record<string, boolean>;
  currentSubstepIndex?: number;

  logMode?: StepperDebugMode;
}

// ============================================================================
// Helpers
// ============================================================================

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 1));
}

function safeIndex(value: number, maxIndex: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.floor(value), maxIndex));
}

function getTotalStepCount(steps: readonly StepItem[]): number {
  return steps.length > 0 ? steps.length : FLOW_PHASES.length;
}

function countPassedSubsteps(
  phase: FlowPhase,
  totalSubsteps: number,
  passedSubsteps?: Record<string, boolean>
): number {
  if (!passedSubsteps || totalSubsteps <= 0) return 0;

  let count = 0;
  for (let i = 0; i < totalSubsteps; i++) {
    if (passedSubsteps[`${phase}:${i}`] === true) count++;
  }
  return count;
}

/**
 * Connector progress based on substeps:
 * - A phase with N substeps has (N-1) "transitions" between screens.
 * - When you've passed k substeps, you're effectively k transitions ahead (because store marks current before moving).
 * - This makes the connector reach 100% when you're on the last substep (even if last is not "passed" yet).
 */
function deriveStepProgress01(params: {
  phase: FlowPhase;
  totalSubsteps: number;
  passedSubsteps?: Record<string, boolean>;
  fallbackProgress: number;
}): number {
  const { phase, totalSubsteps, passedSubsteps, fallbackProgress } = params;

  if (totalSubsteps > 1) {
    const passedCount = countPassedSubsteps(phase, totalSubsteps, passedSubsteps);
    const transitionsTotal = totalSubsteps - 1;
    const transitionsDone = Math.min(passedCount, transitionsTotal);
    return clamp01(transitionsDone / transitionsTotal);
  }

  // If no/1 substep, rely on provided progress (if any)
  return clamp01(fallbackProgress);
}

function isStepCompleted(params: {
  phase: FlowPhase;
  stepIndex: number;
  currentStep: number;
  totalSubsteps: number;
  passedPhases?: Record<FlowPhase, boolean>;
  passedSubsteps?: Record<string, boolean>;
}): boolean {
  const {
    phase,
    stepIndex,
    currentStep,
    totalSubsteps,
    passedPhases,
    passedSubsteps,
  } = params;

  if (passedPhases?.[phase] === true) return true;

  // moved past this phase
  if (currentStep > stepIndex) return true;

  // all substeps passed
  if (totalSubsteps > 0) {
    const passedCount = countPassedSubsteps(phase, totalSubsteps, passedSubsteps);
    if (passedCount >= totalSubsteps) return true;


  }

  return false;
}

function buildDebugSummary(
  input: StepperStateInput,
  states: StepperVisualState[],
  issues: string[]
) {
  return {
    currentStep: input.currentStep,
    safeCurrentStep: safeIndex(input.currentStep, input.steps.length - 1),
    steps: input.steps.map((s, i) => ({ id: s.id, label: s.label, state: states[i] })),
    issues,
  };
}

// ============================================================================
// Main
// ============================================================================

export function getStepperVisualStates(input: StepperStateInput): StepperVisualState[] {
  const {
    steps,
    currentStep,
    progress,
    passedPhases,
    passedSubsteps,
    currentSubstepIndex,
    logMode = 'issues-only',
  } = input;

  if (!steps.length) return [];

  const lastIndex = steps.length - 1;
  const safeCurrentStep = safeIndex(currentStep, lastIndex);

  const issues: string[] = [];
  if (safeCurrentStep !== currentStep) issues.push('currentStep_out_of_range');

  // Precompute per-step runtime info (progress + completion)
  const runtime = steps.map((step, index) => {
    const phase = step.id as FlowPhase;
    const totalSubsteps = getSubstepCount(phase);

    const completed = isStepCompleted({
      phase,
      stepIndex: index,
      currentStep: safeCurrentStep,
      totalSubsteps,
      passedPhases,
      passedSubsteps,
    });

    // Use real-time progress from parent when available so connector reflects current substep position.
    const derivedProgress = deriveStepProgress01({
      phase,
      totalSubsteps,
      passedSubsteps,
      fallbackProgress: progress,
    });
    const stepProgress01 =
      index === safeCurrentStep && !completed
        ? clamp01(Number.isFinite(progress) && progress >= 0 ? progress : derivedProgress)
        : 0;

    // A small sanity check: if currentSubstepIndex is beyond totalSubsteps, flag it
    if (
      index === safeCurrentStep &&
      typeof currentSubstepIndex === 'number' &&
      totalSubsteps > 0 &&
      (currentSubstepIndex < 0 || currentSubstepIndex > totalSubsteps - 1)
    ) {
      issues.push('currentSubstepIndex_out_of_range');
    }

    return {
      index,
      completed,
      stepProgress01: clamp01(stepProgress01),
    };
  });

  const states: StepperVisualState[] = steps.map((_, index) => {
    const isActive = index === safeCurrentStep;

    const prev = index > 0 ? runtime[index - 1] : null;
    const cur = runtime[index];

    // LEFT connector belongs to previous step progress/completion
    const leftFilled = !!prev?.completed;
    const leftPartial =
      prev && prev.index === safeCurrentStep && !prev.completed && prev.stepProgress01 > 0
        ? prev.stepProgress01
        : undefined;

    // RIGHT connector belongs to current step progress/completion
    const rightFilled = index < lastIndex && cur.completed;
    const rightPartial =
      index < lastIndex && isActive && !cur.completed && cur.stepProgress01 > 0
        ? cur.stepProgress01
        : undefined;

    const showsCheck = cur.completed;
    const highlighted = showsCheck || isActive;

    return {
      isActive,
      showsCheck,
      leftFilled,
      leftPartial,
      rightFilled,
      rightPartial,
      highlighted,
    };
  });

  const shouldLog = logMode === 'always' || issues.length > 0;
  // if (shouldLog) {
  //   console.log('[ProgressStepper] Visual states', buildDebugSummary(input, states, issues));
  // }

  return states;
}

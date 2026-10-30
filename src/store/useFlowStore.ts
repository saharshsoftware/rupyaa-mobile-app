import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FLOW_CONFIG,
  FLOW_PHASES,
  getSubstepCount,
  getMainStepLabels,
} from '@/src/config/flowSteps';
import type { FlowPhase } from '@/src/config/flowSteps';
import type { UserStage } from '@/src/config/userStages';
import { isHomeRedirectUserStage } from '@/src/config/userStages';
import type { UserStageContext, UserStageSectionsCompleted } from '@/src/types/user';
import { buildProgressStateFromPosition, resolveFlowPositionFromUserStage } from '@/src/utils/flowProgress';
import { devLog } from '@/src/utils/devLogger';
import { clampFlowPosition, createFlowPersistConfig } from './flowPersistence';

export type TransitionDirection = 'forward' | 'backward';

export type StageSyncStatus = 'idle' | 'loading' | 'error';

export interface FlowCheckpoint {
  phase: FlowPhase;
  substepId: string;
  timestamp: number;
}

export interface FlowState {
  phaseIndex: number;
  substepIndex: number;
  applicationCompleted: boolean;
  userStage?: UserStage;
  userStageContext: UserStageContext | null;
  showDashboard: boolean;
  cameFromOfferings: boolean;

  /** Legacy compat: same as phaseIndex. */
  currentStep: number;
  /** Legacy compat: main step labels. */
  steps: readonly { id: string; label: string }[];

  /** Track passed substeps: key format "phase:substepIndex" e.g. "register:0", "kyc:2" */
  passedSubsteps: Record<string, boolean>;
  /** Track passed phases (entire phase completed) */
  passedPhases: Record<FlowPhase, boolean>;

  /** Direction of last step change (for animations). Not persisted. */
  transitionDirection: TransitionDirection;
  /** Stage sync API status. Not persisted. */
  stageSyncStatus: StageSyncStatus;
  /** Last completed substep (for resume). Persisted. */
  lastCheckpoint: FlowCheckpoint | null;

  next: () => void;
  prev: () => void;
  goTo: (phase: FlowPhase, substep: number) => void;
  syncFromUserStage: (
    stage: UserStage,
    sectionsCompleted?: UserStageSectionsCompleted,
    context?: UserStageContext
  ) => void;
  reset: () => void;
  completeFlow: () => void;
  markSubstepPassed: (phase: FlowPhase, substepIndex: number) => void;
  markPhasePassed: (phase: FlowPhase) => void;
  isSubstepPassed: (phase: FlowPhase, substepIndex: number) => boolean;
  isPhasePassed: (phase: FlowPhase) => boolean;
  /** When set, loan journey is stopped (e.g. no offer / 404). Show message and block next. Not persisted. */
  journeyStoppedReason: string | null;
  setJourneyStoppedReason: (reason: string | null) => void;
  /** When set, the ineligibility overlay is shown over the loan journey. Not persisted. */
  ineligibilityMessage: string | null;
  showIneligibility: (message: string) => void;
  clearIneligibility: () => void;
  /** When true, the offer status full-screen modal is shown (Verified/Pending/Rejected). Not persisted. */
  showOfferStatusModal: boolean;
  /** Resolved variant for OfferStatusModal. Set atomically with showOfferStatusModal to avoid cross-store race. */
  offerStatusVariant: 'Verified' | 'Pending' | 'Rejected' | null;
  setShowOfferStatusModal: (value: boolean, variant?: 'Verified' | 'Pending' | 'Rejected') => void;
  setShowDashboard: (value: boolean) => void;
  setCameFromOfferings: (value: boolean) => void;
  setStageSyncStatus: (status: StageSyncStatus) => void;
  /** Dev-only: when true, next fetchUserStage will skip syncing (so toolbar "Next step" is not reverted). Not persisted. */
  skipNextUserStageSync: boolean;
  setSkipNextUserStageSync: (value: boolean) => void;
}

const initialState = {
  phaseIndex: 0,
  substepIndex: 0,
  applicationCompleted: false,
  userStage: undefined as UserStage | undefined,
  userStageContext: null as UserStageContext | null,
  showDashboard: false,
  cameFromOfferings: false,
  currentStep: 0,
  steps: getMainStepLabels(),
  passedSubsteps: {} as Record<string, boolean>,
  passedPhases: {
    register: false,
    offer: false,
    kyc: false,
    disbursal: false,
  } as Record<FlowPhase, boolean>,
  journeyStoppedReason: null as string | null,
  ineligibilityMessage: null as string | null,
  showOfferStatusModal: false,
  offerStatusVariant: null as 'Verified' | 'Pending' | 'Rejected' | null,
  transitionDirection: 'forward' as TransitionDirection,
  stageSyncStatus: 'idle' as StageSyncStatus,
  lastCheckpoint: null as FlowCheckpoint | null,
  skipNextUserStageSync: false,
};

const persistConfig = createFlowPersistConfig<FlowState>();

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => {
      // Guard against accidental double-advances caused by:
      // - rapid taps on primary CTA
      // - multiple timers/effects calling `onNext()` on the same screen
      // This is intentionally NOT persisted.
      let lastNextAt = 0;

      return ({
      ...initialState,

      next: () => {
        const now = Date.now();
        if (now - lastNextAt < 800) return;
        lastNextAt = now;

        const { phaseIndex, substepIndex, markSubstepPassed, markPhasePassed } = get();
        const safe = clampFlowPosition(phaseIndex, substepIndex);
        if (safe.phaseIndex !== phaseIndex || safe.substepIndex !== substepIndex) {
          // Reset invalid state before progressing to prevent unintended jumps.
          set({ phaseIndex: safe.phaseIndex, substepIndex: safe.substepIndex, currentStep: safe.phaseIndex });
          return;
        }

        const fromId = FLOW_CONFIG[safe.phase].substeps[safe.substepIndex]?.id ?? 'unknown';
        const toId =
          safe.substepIndex < safe.totalSubsteps - 1
            ? (FLOW_CONFIG[safe.phase].substeps[safe.substepIndex + 1]?.id ?? 'unknown')
            : (safe.phaseIndex < FLOW_PHASES.length - 1
                ? (FLOW_CONFIG[FLOW_PHASES[safe.phaseIndex + 1]].substeps[0]?.id ?? 'unknown')
                : 'end');

        // Mark current substep as passed before moving forward
        markSubstepPassed(safe.phase, safe.substepIndex);

        set({ transitionDirection: 'forward' });
        if (safe.substepIndex < safe.totalSubsteps - 1) {
          set({ substepIndex: safe.substepIndex + 1 });
        } else if (safe.phaseIndex < FLOW_PHASES.length - 1) {
          // Mark current phase as passed when moving to next phase
          markPhasePassed(safe.phase);
          set({ phaseIndex: safe.phaseIndex + 1, substepIndex: 0, currentStep: safe.phaseIndex + 1 });
        } else {
          // Mark final phase as passed when completing the flow
          markPhasePassed(safe.phase);
        }
        devLog.transition(fromId, toId, 'forward');
      },

      prev: () => {
        const { phaseIndex, substepIndex } = get();
        const safe = clampFlowPosition(phaseIndex, substepIndex);
        if (safe.phaseIndex !== phaseIndex || safe.substepIndex !== substepIndex) {
          // Reset invalid state before moving backward to keep indices consistent.
          set({ phaseIndex: safe.phaseIndex, substepIndex: safe.substepIndex, currentStep: safe.phaseIndex });
          return;
        }

        const fromId = FLOW_CONFIG[safe.phase].substeps[safe.substepIndex]?.id ?? 'unknown';
        const toId =
          safe.substepIndex > 0
            ? (FLOW_CONFIG[safe.phase].substeps[safe.substepIndex - 1]?.id ?? 'unknown')
            : (safe.phaseIndex > 0
                ? (FLOW_CONFIG[FLOW_PHASES[safe.phaseIndex - 1]].substeps[getSubstepCount(FLOW_PHASES[safe.phaseIndex - 1]) - 1]?.id ?? 'unknown')
                : 'start');

        set({ transitionDirection: 'backward' });
        if (safe.substepIndex > 0) {
          set({ substepIndex: safe.substepIndex - 1 });
        } else if (safe.phaseIndex > 0) {
          const prevPhase = FLOW_PHASES[safe.phaseIndex - 1];
          const prevTotal = getSubstepCount(prevPhase);
          set({
            phaseIndex: safe.phaseIndex - 1,
            substepIndex: prevTotal - 1,
            currentStep: safe.phaseIndex - 1,
          });
        }
        devLog.transition(fromId, toId, 'backward');
      },

      goTo: (phase: FlowPhase, substep: number) => {
        const { phaseIndex: currPhaseIndex, substepIndex: currSubstepIndex } = get();
        const currPhase = FLOW_PHASES[currPhaseIndex];
        const currSubstepId = FLOW_CONFIG[currPhase].substeps[currSubstepIndex]?.id ?? 'unknown';

        const phaseIndex = FLOW_PHASES.indexOf(phase);
        const total = getSubstepCount(phase);
        const clampedSubstep = Math.max(0, Math.min(substep, total - 1));
        const progress = buildProgressStateFromPosition(phaseIndex, clampedSubstep);
        const toSubstepId = FLOW_CONFIG[phase].substeps[clampedSubstep]?.id ?? 'unknown';

        const isForward =
          progress.phaseIndex > currPhaseIndex ||
          (progress.phaseIndex === currPhaseIndex && progress.substepIndex > currSubstepIndex);
        const direction: TransitionDirection = isForward ? 'forward' : 'backward';

        set({
          phaseIndex: progress.phaseIndex,
          substepIndex: progress.substepIndex,
          currentStep: progress.phaseIndex,
          passedSubsteps: progress.passedSubsteps,
          passedPhases: progress.passedPhases,
          transitionDirection: direction,
        });
        devLog.transition(currSubstepId, toSubstepId, direction);
      },

      syncFromUserStage: (
        stage: UserStage,
        sectionsCompleted?: UserStageSectionsCompleted,
        context?: UserStageContext
      ) => {
        const currentState = get();
        const navigationState = (() => {
          const position = resolveFlowPositionFromUserStage(stage, sectionsCompleted);
          const progress = buildProgressStateFromPosition(
            position.phaseIndex,
            position.substepIndex
          );
          return {
            phaseIndex: progress.phaseIndex,
            substepIndex: progress.substepIndex,
            currentStep: progress.phaseIndex,
            passedSubsteps: progress.passedSubsteps,
            passedPhases: progress.passedPhases,
          };
        })();
        const shouldMarkFlowCompleted = isHomeRedirectUserStage(stage);
        const nextContext =
          context ?? (stage === 'OFFERINGS' ? currentState.userStageContext : null);
        set({
          ...navigationState,
          userStage: stage,
          userStageContext: nextContext,
          applicationCompleted: shouldMarkFlowCompleted,
          cameFromOfferings:
            stage === 'OFFERINGS' ? currentState.cameFromOfferings : false,
        });

        // Lazy import avoids Metro cycle: clarityUserSession -> verifiedPhoneNumber -> storageService -> useFlowStore.
        void import('@/src/services/analytics/clarityUserSession').then(({ syncClarityAfterUserStageSync }) =>
          syncClarityAfterUserStageSync(stage),
        );
      },

      completeFlow: () => {
        set({ applicationCompleted: true });
      },

      reset: () => {
        set(initialState);
      },

      markSubstepPassed: (phase: FlowPhase, substepIndex: number) => {
        const key = `${phase}:${substepIndex}`;
        const { passedSubsteps } = get();
        const phaseConfig = FLOW_CONFIG[phase];
        const substep = phaseConfig.substeps[substepIndex];
        const substepId = substep?.id ?? 'unknown';

        // Only mark if not already passed to avoid duplicate logs
        if (!passedSubsteps[key]) {
          set((state) => ({
            passedSubsteps: {
              ...state.passedSubsteps,
              [key]: true,
            },
          }));
          devLog.stepPassed(phase, substepIndex, substepId, substep?.label || 'Unknown');
        }

        // Update checkpoint for resume (every pass, not only first)
        const timestamp = Date.now();
        const checkpoint: FlowCheckpoint = { phase, substepId, timestamp };
        set({ lastCheckpoint: checkpoint });
        devLog.checkpoint(phase, substepId, timestamp);
      },

      markPhasePassed: (phase: FlowPhase) => {
        const { passedPhases } = get();
        
        // Only mark if not already passed to avoid duplicate logs
        if (!passedPhases[phase]) {
          const phaseConfig = FLOW_CONFIG[phase];
          
          set((state) => ({
            passedPhases: {
              ...state.passedPhases,
              [phase]: true,
            },
          }));

          // Log phase pass
          devLog.phasePassed(phase, phaseConfig.label);
        }
      },

      isSubstepPassed: (phase: FlowPhase, substepIndex: number) => {
        const key = `${phase}:${substepIndex}`;
        return get().passedSubsteps[key] === true;
      },

      isPhasePassed: (phase: FlowPhase) => {
        return get().passedPhases[phase] === true;
      },

      setJourneyStoppedReason: (reason) => set({ journeyStoppedReason: reason }),
      showIneligibility: (message) => set({ ineligibilityMessage: message }),
      clearIneligibility: () => set({ ineligibilityMessage: null }),
      setShowOfferStatusModal: (value, variant) => set({
        showOfferStatusModal: value,
        offerStatusVariant: value ? (variant ?? null) : null,
      }),
      setShowDashboard: (value) => set({ showDashboard: value }),
      setCameFromOfferings: (value) => set({ cameFromOfferings: value }),
      setStageSyncStatus: (status) => set({ stageSyncStatus: status }),
      setSkipNextUserStageSync: (value) => set({ skipNextUserStageSync: value }),
    });
    },
    persistConfig
  )
);

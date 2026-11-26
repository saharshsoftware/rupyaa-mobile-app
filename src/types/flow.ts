import type React from 'react';
import type { StepComponentId } from '@/src/config/flowSteps';

/** A single substep within a phase */
export interface FlowSubstep {
  id: string;
  label: string;
  component: StepComponentId;
}

/** Configuration for a flow phase (e.g., Register, Offer, KYC, Disbursal) */
export interface FlowPhaseConfig {
  id: string;
  label: string;
  substeps: readonly FlowSubstep[];
}

/** Props passed to every step component */
export interface StepProps {
  onNext: () => void;
  onPrev: () => void;
  /** Optional content rendered at the top of the step scroll area. */
  header?: React.ReactNode;
}

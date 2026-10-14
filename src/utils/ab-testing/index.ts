/**
 * A/B Testing Module
 *
 * Central export point for all experiment flags, variant evaluators, and segment utilities.
 *
 * How to add a new A/B test:
 * 1. Create an experiment file in `src/utils/ab-testing/experiments/<experiment-name>.ts`.
 * 2. Define experiment rules and export the evaluation function.
 * 3. Re-export the evaluation function from this index file.
 */

export * from './is-even-phone-number';
export * from './experiments/improve-offer';

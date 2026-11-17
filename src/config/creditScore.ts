import { colors } from '@/src/theme';
import type { CreditReportData } from '@/src/types/creditScore';

export const CREDIT_SCORE_UNAVAILABLE = -1;
export const CREDIT_SCORE_MAX_ATTEMPTS = 5;

/** Bureau returns -1, 0, or null when no score can be shown. */
export function isCreditScoreUnavailable(
  score: number | null | undefined,
): boolean {
  return score == null || score === CREDIT_SCORE_UNAVAILABLE || score === 0;
}

export function getCreditScoreAttemptsLeft(attemptsUsed: number): number {
  return Math.max(0, CREDIT_SCORE_MAX_ATTEMPTS - Math.max(0, attemptsUsed));
}

export function hasCreditScoreAttemptsRemaining(attemptsUsed: number): boolean {
  return getCreditScoreAttemptsLeft(attemptsUsed) > 0;
}

export type RenderableCreditReport = CreditReportData & { creditScore: number };

/** Guards against incomplete / unavailable bureau payloads that would crash the report UI. */
export function isRenderableCreditReport(
  report: CreditReportData | null | undefined
): report is RenderableCreditReport {
  return (
    !!report &&
    typeof report.creditScore === 'number' &&
    !isCreditScoreUnavailable(report.creditScore) &&
    !!report.creditSummary &&
    typeof report.creditSummary === 'object'
  );
}

export function getCreditScorePresentation(score: number): { rating: string; color: string } {
  const bounded = Math.min(900, Math.max(300, score));
  if (bounded < 580) return { rating: 'Poor', color: colors.error.main };
  if (bounded < 670) return { rating: 'Average', color: colors.warning.dark };
  if (bounded < 740) return { rating: 'Fair', color: colors.warning.main };
  if (bounded < 800) return { rating: 'Good', color: colors.success.main };
  return { rating: 'Excellent', color: colors.success.dark };
}

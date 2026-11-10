import { colors } from '@/src/theme';
import type { CreditReportData } from '@/src/types/creditScore';

export const CREDIT_SCORE_UNAVAILABLE = -1;

export function isCreditScoreUnavailable(score: number): boolean {
  return score === CREDIT_SCORE_UNAVAILABLE;
}

/** Guards against incomplete bureau payloads that would crash the report UI. */
export function isRenderableCreditReport(
  report: CreditReportData | null | undefined
): report is CreditReportData {
  return (
    !!report &&
    typeof report.creditScore === 'number' &&
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

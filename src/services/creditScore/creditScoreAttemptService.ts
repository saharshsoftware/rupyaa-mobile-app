import {
  CREDIT_SCORE_MAX_ATTEMPTS,
  getCreditScoreAttemptsLeft,
  hasCreditScoreAttemptsRemaining,
} from '@/src/config/creditScore';
import { storageService } from '@/src/services/storage';
import type { CreditScoreFormData } from './creditScoreSchema';

function parseAttempts(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(CREDIT_SCORE_MAX_ATTEMPTS, parsed);
}

export async function getCreditScoreAttemptsUsed(): Promise<number> {
  const raw = await storageService.getKey('creditScorePullAttempts');
  return parseAttempts(raw);
}

export async function setCreditScoreAttemptsUsed(count: number): Promise<number> {
  const next = Math.min(
    CREDIT_SCORE_MAX_ATTEMPTS,
    Math.max(0, Math.floor(count)),
  );
  await storageService.setKey('creditScorePullAttempts', String(next));
  return next;
}

/** Counts one pull attempt. Returns the new used count. */
export async function incrementCreditScoreAttempts(): Promise<number> {
  const used = await getCreditScoreAttemptsUsed();
  if (used >= CREDIT_SCORE_MAX_ATTEMPTS) return used;
  return setCreditScoreAttemptsUsed(used + 1);
}

export async function resetCreditScoreAttempts(): Promise<void> {
  await storageService.clearKey('creditScorePullAttempts');
}

export async function canAttemptCreditScorePull(): Promise<boolean> {
  const used = await getCreditScoreAttemptsUsed();
  return hasCreditScoreAttemptsRemaining(used);
}

export async function saveCreditScoreFormDraft(
  draft: CreditScoreFormData,
): Promise<void> {
  await storageService.setKey('creditScoreFormDraft', JSON.stringify({
    fullName: draft.fullName ?? '',
    panNumber: draft.panNumber ?? '',
    dob: draft.dob ?? '',
    email: draft.email ?? '',
    monthlyIncome: draft.monthlyIncome ?? '',
    consent: draft.consent === true,
  }));
}

export async function getCreditScoreFormDraft(): Promise<CreditScoreFormData | null> {
  const raw = await storageService.getKey('creditScoreFormDraft');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CreditScoreFormData>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      fullName: typeof parsed.fullName === 'string' ? parsed.fullName : '',
      panNumber: typeof parsed.panNumber === 'string' ? parsed.panNumber : '',
      dob: typeof parsed.dob === 'string' ? parsed.dob : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      monthlyIncome: typeof parsed.monthlyIncome === 'string' ? parsed.monthlyIncome : '',
      consent: parsed.consent === true,
    };
  } catch {
    return null;
  }
}

export async function clearCreditScoreFormDraft(): Promise<void> {
  await storageService.clearKey('creditScoreFormDraft');
}

export {
  getCreditScoreAttemptsLeft,
  hasCreditScoreAttemptsRemaining,
  CREDIT_SCORE_MAX_ATTEMPTS,
};

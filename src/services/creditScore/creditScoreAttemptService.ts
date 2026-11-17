import {
  CREDIT_SCORE_MAX_ATTEMPTS,
  getCreditScoreAttemptsLeft,
  hasCreditScoreAttemptsRemaining,
} from '@/src/config/creditScore';
import { storageService } from '@/src/services/storage';
import { resolveVerifiedPhoneNumber } from '@/src/services/user/verifiedPhoneNumber';
import type { CreditScoreFormData } from './creditScoreSchema';

type AttemptsByPhone = Record<string, number>;
type DraftByPhone = Record<string, CreditScoreFormData>;

function parseAttemptsCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(CREDIT_SCORE_MAX_ATTEMPTS, parsed);
}

async function resolvePhoneKey(): Promise<string> {
  return resolveVerifiedPhoneNumber();
}

async function readAttemptsByPhone(): Promise<AttemptsByPhone> {
  const raw = await storageService.getKey('creditScorePullAttempts');
  if (!raw) return {};

  // Legacy device-global integer leaked across logins — drop it.
  if (/^\d+$/.test(raw.trim())) {
    await storageService.clearKey('creditScorePullAttempts');
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as AttemptsByPhone;
  } catch {
    return {};
  }
}

async function writeAttemptsByPhone(map: AttemptsByPhone): Promise<void> {
  await storageService.setKey('creditScorePullAttempts', JSON.stringify(map));
}

async function readDraftByPhone(): Promise<DraftByPhone> {
  const raw = await storageService.getKey('creditScoreFormDraft');
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    // Legacy single-draft object (had fullName/panNumber at top level).
    if ('fullName' in parsed || 'panNumber' in parsed) {
      await storageService.clearKey('creditScoreFormDraft');
      return {};
    }

    return parsed as DraftByPhone;
  } catch {
    return {};
  }
}

async function writeDraftByPhone(map: DraftByPhone): Promise<void> {
  await storageService.setKey('creditScoreFormDraft', JSON.stringify(map));
}

function normalizeDraft(draft: CreditScoreFormData): CreditScoreFormData {
  return {
    fullName: draft.fullName ?? '',
    panNumber: draft.panNumber ?? '',
    dob: draft.dob ?? '',
    email: draft.email ?? '',
    monthlyIncome: draft.monthlyIncome ?? '',
    consent: draft.consent === true,
  };
}

export async function getCreditScoreAttemptsUsed(): Promise<number> {
  const phone = await resolvePhoneKey();
  if (!phone) return 0;
  const map = await readAttemptsByPhone();
  return parseAttemptsCount(map[phone]);
}

export async function setCreditScoreAttemptsUsed(count: number): Promise<number> {
  const phone = await resolvePhoneKey();
  if (!phone) return 0;

  const next = Math.min(
    CREDIT_SCORE_MAX_ATTEMPTS,
    Math.max(0, Math.floor(count)),
  );
  const map = await readAttemptsByPhone();
  map[phone] = next;
  await writeAttemptsByPhone(map);
  return next;
}

/** Counts one pull attempt for the current phone. Returns the new used count. */
export async function incrementCreditScoreAttempts(): Promise<number> {
  const used = await getCreditScoreAttemptsUsed();
  if (used >= CREDIT_SCORE_MAX_ATTEMPTS) return used;
  return setCreditScoreAttemptsUsed(used + 1);
}

export async function resetCreditScoreAttempts(): Promise<void> {
  const phone = await resolvePhoneKey();
  if (!phone) return;
  const map = await readAttemptsByPhone();
  if (!(phone in map)) return;
  delete map[phone];
  if (Object.keys(map).length === 0) {
    await storageService.clearKey('creditScorePullAttempts');
    return;
  }
  await writeAttemptsByPhone(map);
}

export async function canAttemptCreditScorePull(): Promise<boolean> {
  const used = await getCreditScoreAttemptsUsed();
  return hasCreditScoreAttemptsRemaining(used);
}

export async function saveCreditScoreFormDraft(
  draft: CreditScoreFormData,
): Promise<void> {
  const phone = await resolvePhoneKey();
  if (!phone) return;
  const map = await readDraftByPhone();
  map[phone] = normalizeDraft(draft);
  await writeDraftByPhone(map);
}

export async function getCreditScoreFormDraft(): Promise<CreditScoreFormData | null> {
  const phone = await resolvePhoneKey();
  if (!phone) return null;
  const map = await readDraftByPhone();
  const draft = map[phone];
  if (!draft || typeof draft !== 'object') return null;
  return normalizeDraft(draft);
}

export async function clearCreditScoreFormDraft(): Promise<void> {
  const phone = await resolvePhoneKey();
  if (!phone) return;
  const map = await readDraftByPhone();
  if (!(phone in map)) return;
  delete map[phone];
  if (Object.keys(map).length === 0) {
    await storageService.clearKey('creditScoreFormDraft');
    return;
  }
  await writeDraftByPhone(map);
}

export {
  getCreditScoreAttemptsLeft,
  hasCreditScoreAttemptsRemaining,
  CREDIT_SCORE_MAX_ATTEMPTS,
};

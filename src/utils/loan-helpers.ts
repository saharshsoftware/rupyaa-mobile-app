/**
 * Loan routing and date helpers for active loan dashboard flow.
 */

import type {
  BureauPolicyAnalyticsPayload,
  EmiRepaymentScheduleItem,
  EmiBlockLockState,
  EmiBlockStatus,
  EmiPaymentDecision,
  EmiRepaymentState,
  GetExistingActiveLoanResponse,
  Loan,
} from '@/src/types/loans';
import { EMI_BLOCK_STATUS } from '@/src/types/loans';
import type { ApiResponse } from '@/src/types/api';
import type { CurrentOfferResponse, OfferLoanStatus } from '@/src/types/offer';
import type { UserEligibilityExperianResponse } from '@/src/types/user';
import { consoleLogDev, formatCurrency, getTotalPayable } from '@/src/utils/common-helper';
import { getLoanTypeDisplayName } from '@/src/utils/loan-formatters';

/** Loan status value when loan is fully paid (get-existing-active-loan response). */
export const LOAN_STATUS_PAID = 'Paid';

/**
 * Returns true if the loan status indicates the loan is fully paid (case-insensitive).
 * Use for get-existing-active-loan response; when true, payment/foreclosure screens should redirect to home.
 */
export function isLoanStatusPaid(loanStatus: string | null | undefined): boolean {
  if (loanStatus == null || typeof loanStatus !== 'string') return false;
  return loanStatus.trim().toLowerCase() === LOAN_STATUS_PAID.toLowerCase();
}

/** Show NOC CTA on history cards when loan.status is fully paid. */
export function shouldShowNocCta(loan: Loan | null | undefined): boolean {
  return isLoanStatusPaid(loan?.status);
}

/**
 * True when get-existing-active-loan top-level `loanStatus` is pending (application under review).
 */
export function isLoanStatusPending(loanStatus: string | null | undefined): boolean {
  if (loanStatus == null || typeof loanStatus !== 'string') return false;
  return loanStatus.trim().toLowerCase() === 'pending';
}

export type OfferStatusModalVariant = 'Verified' | 'Pending' | 'Rejected';

/** Safely extracts eligibility error details only from failed API responses. */
export function getEligibilityErrorDetails(
  response: ApiResponse<UserEligibilityExperianResponse>
): Partial<UserEligibilityExperianResponse> | undefined {
  if (response.success) return undefined;
  const details = response.error?.details;
  return typeof details === 'object' && details !== null
    ? (details as Partial<UserEligibilityExperianResponse>)
    : undefined;
}

/** Maps loan status to the offer modal variant; missing status still means Verified when an offer exists. */
export function resolveOfferStatusModalVariant(
  offerLoanStatus: OfferLoanStatus | undefined
): OfferStatusModalVariant {
  if (offerLoanStatus === 'Pending') return 'Pending';
  if (offerLoanStatus === 'rejected') return 'Rejected';
  return 'Verified';
}

/** Uses the API no-offer message when present, otherwise falls back to bank statement guidance. */
export function resolveNoOfferMessage(
  offerResponse: ApiResponse<CurrentOfferResponse>
): string {
  if (!offerResponse.success || offerResponse.data == null) {
    return 'No offer available. Please complete bank statement verification.';
  }

  const message = offerResponse.data.message;
  return typeof message === 'string' && message.trim().length > 0
    ? message
    : 'No offer available. Please complete bank statement verification.';
}

/** Builds the rejection analytics payload from eligibility error details. */
export function getPayloadForBureauPolicyResponse(eligibilityDataError: Partial<UserEligibilityExperianResponse>): BureauPolicyAnalyticsPayload {
  return {
    status: eligibilityDataError?.status,
    decile: eligibilityDataError?.decile,
    empType: eligibilityDataError?.empType,
    declaredSalary: eligibilityDataError?.salary ?? 0,
    offerAmount: 0,
  }
}

export type LoanCategory = 'ongoing' | 'history';

export interface ClassifiedLoans {
  ongoing: Loan[];
  history: Loan[];
}

function normalizeLoanStatus(loan: Loan | null | undefined): string {
  if (!loan?.status || typeof loan.status !== 'string') return '';
  return loan.status.trim().toLowerCase();
}

// add or remove statuses here (value decided by Sumit Sir)
const HISTORY_LOAN_STATUSES = ['paid'];  // suggestion by suit
const ONGOING_LOAN_STATUSES = ['disbursed', 'overdue'];

export function isHistoryLoan(loan: Loan): boolean {
  const status = normalizeLoanStatus(loan);
  if (!status) return false;
  return HISTORY_LOAN_STATUSES.includes(status);
}

export function isOngoingLoan(loan: Loan): boolean {
  const status = normalizeLoanStatus(loan);
  if (!status) return false;
  if (ONGOING_LOAN_STATUSES.includes(status)) return true;
  return false;
}

/**
 * Classify loans into ongoing vs history buckets.
 * - History: status in [NPA, Paid, Waivered, Expired] OR isForeclosed === true
 * - Ongoing: status in [Disbursed, Overdue] or anything else not matched above
 */
export function classifyLoans(loans: Loan[]): ClassifiedLoans {
  const ongoing: Loan[] = [];
  const history: Loan[] = [];

  for (const loan of loans) {
    if (isHistoryLoan(loan)) {
      history.push(loan);
    } else if (isOngoingLoan(loan)) {
      ongoing.push(loan);
    }
  }

  consoleLogDev('ongoing', ongoing);
  consoleLogDev('history', history);

  return { ongoing, history };
}

/**
 * Derive a human-friendly loan title for cards.
 * Prefer `reason` (e.g. "personal loan") and title-case it; fallback to loan type display name.
 */
export function getLoanDisplayTitle(loan: Loan): string {
  const reason = typeof loan.reason === 'string' ? loan.reason.trim() : '';
  if (reason.length > 0) {
    return reason.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const typeName = loan.type ? getLoanTypeDisplayName(loan.type) : '';
  return typeName || 'Personal Loan';
}

/**
 * Returns true if loan status is Disbursed (case-insensitive).
 * Backend may return "DISBURSED" or "Disbursed".
 */
export function isDisbursedLoan(loan: Loan | null): boolean {
  if (!loan?.status || typeof loan.status !== 'string') return false;
  return loan.status.toLowerCase() === 'disbursed';
  // return true;
}

/**
 * Returns true if dueDate is strictly after today (start of day, local timezone).
 * Used to decide foreclosure vs payment: future due date → foreclosure.
 */
export function isDueDateInFuture(dueDate: string): boolean {
  if (!dueDate || typeof dueDate !== 'string') return false;
  const date = new Date(dueDate);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}

export type ActiveLoanScreenType = 'foreclosure' | 'payment' | 'payment-emi';

export function isEmiLoanTypeValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toUpperCase() === 'EMI';
}

export function isEmiLoan(loan: Loan | null | undefined): boolean {
  return isEmiLoanTypeValue(loan?.type);
}

/**
 * Selects the EMI loan used by the active-loan dashboard card.
 * The response-level loanType is authoritative for choosing the dashboard UI.
 */
export function resolveActiveDashboardEmiLoan(
  activeLoanData: GetExistingActiveLoanResponse | null | undefined,
  isActiveLoanDashboard: boolean
): Loan | null {
  if (!isActiveLoanDashboard) return null;
  if (!isEmiLoanTypeValue(activeLoanData?.loanType)) return null;
  return activeLoanData?.loan ?? null;
}

function parsePositiveNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return undefined;
}

function getEmiRepaymentSummary(loan: Loan | null) {
  return loan?.emiRepayment?.summary ?? null;
}

export function getEmiTotalEmis(loan: Loan | null): number {
  const summaryTotal = parsePositiveNumber(getEmiRepaymentSummary(loan)?.totalEmis);
  return summaryTotal ?? 0;
}

export function getEmiMonthlyAmount(loan: Loan | null): number {
  const summaryMonthlyEmi = parsePositiveNumber(getEmiRepaymentSummary(loan)?.monthlyEmi);
  if (summaryMonthlyEmi != null) return summaryMonthlyEmi;

  return summaryMonthlyEmi ?? 0;
}

export function getEmiTotalPayable(loan: Loan | null): number {
  const summaryTotalPayable = parsePositiveNumber(getEmiRepaymentSummary(loan)?.totalPayable);
  return summaryTotalPayable ?? 0;
}

export function getEmiTotalPaid(loan: Loan | null): number {
  const summaryTotalPaid = getEmiRepaymentSummary(loan)?.totalPaid;
  if (typeof summaryTotalPaid === 'number' && Number.isFinite(summaryTotalPaid)) {
    return Math.max(0, summaryTotalPaid);
  }
  return 0;
}

export function getEmiRemainingAmount(loan: Loan | null): number {
  const summaryRemaining = getEmiRepaymentSummary(loan)?.remaining;
  if (typeof summaryRemaining === 'number' && Number.isFinite(summaryRemaining)) {
    return Math.max(0, summaryRemaining);
  }
  return 0;
}

/**
 * Resolves which screen to show for an active DISBURSED loan.
 * - dueDate in future → foreclosure
 * - dueDate today or past → payment
 * - not disbursed or no loan → null
 */
export function resolveActiveLoanScreenType(
  loan: Loan | null
): ActiveLoanScreenType | null {
  if (!loan) return null;
  if (isEmiLoan(loan)) return 'payment-emi';
  return isDueDateInFuture(loan.dueDate) ? 'foreclosure' : 'payment';
}

export function normalizeEmiStatus(status: string | undefined): EmiBlockStatus | '' {
  const normalizedStatus = status?.trim().toUpperCase();
  if (normalizedStatus === EMI_BLOCK_STATUS.paid) return EMI_BLOCK_STATUS.paid;
  if (normalizedStatus === EMI_BLOCK_STATUS.due) return EMI_BLOCK_STATUS.due;
  if (normalizedStatus === EMI_BLOCK_STATUS.overdue) return EMI_BLOCK_STATUS.overdue;
  if (normalizedStatus === EMI_BLOCK_STATUS.upcoming) return EMI_BLOCK_STATUS.upcoming;
  return '';
}

const EMI_PAYMENT_LOG_TAG = '[EMI_PAYMENT_DECISION]';

export function getSortedEmiSchedule(loan: Loan | null): EmiRepaymentScheduleItem[] {
  return [...(loan?.emiRepayment?.schedule ?? [])].sort((a, b) => a.index - b.index);
}

export function getPaidEmiCount(loan: Loan | null): number {
  const summaryPaid = getEmiRepaymentSummary(loan)?.emisPaid;
  if (typeof summaryPaid === 'number' && Number.isFinite(summaryPaid)) {
    return Math.max(0, Math.floor(summaryPaid));
  }
  return 0;
}

export function getNextDueEmiBlock(loan: Loan | null): EmiRepaymentScheduleItem | null {
  const blocks = getSortedEmiSchedule(loan);
  const activeIndex = loan?.emiRepayment?.activeEmiIndex;
  const activeBlock = blocks.find((block) => block.index === activeIndex);
  if (activeBlock != null && normalizeEmiStatus(activeBlock.status) !== EMI_BLOCK_STATUS.paid) {
    return activeBlock;
  }
  const summaryNextDueDate = getEmiRepaymentSummary(loan)?.nextDueDate;
  if (typeof summaryNextDueDate === 'string' && summaryNextDueDate.length > 0) {
    const summaryBlock = blocks.find((block) => block.dueDate === summaryNextDueDate);
    if (summaryBlock != null && normalizeEmiStatus(summaryBlock.status) !== EMI_BLOCK_STATUS.paid) {
      return summaryBlock;
    }
  }
  return (
    blocks.find((block) => {
      const status = normalizeEmiStatus(block.status);
      return status === EMI_BLOCK_STATUS.due || status === EMI_BLOCK_STATUS.overdue;
    }) ??
    blocks.find((block) => normalizeEmiStatus(block.status) !== EMI_BLOCK_STATUS.paid) ??
    null
  );
}

export function getPayableEmiBlocks(loan: Loan | null): EmiRepaymentScheduleItem[] {
  const blocks = getSortedEmiSchedule(loan);
  return blocks.filter((block) => {
    const status = normalizeEmiStatus(block.status);
    return status === EMI_BLOCK_STATUS.overdue || status === EMI_BLOCK_STATUS.due;
  });
}

export function getEmiBlockPayableAmount(block: EmiRepaymentScheduleItem | null | undefined): number {
  if (block == null) return 0;
  if (typeof block.payableTotal === 'number' && Number.isFinite(block.payableTotal)) {
    return Math.max(0, block.payableTotal);
  }
  const penalCharge = block.penalCharge ?? 0;
  const gstOnPenal = block.gstOnPenal ?? 0;
  const bounceCharge = block.bounceCharge ?? 0;
  const gstOnBounce = block.gstOnBounce ?? 0;
  return block.emiAmount + penalCharge + gstOnPenal + bounceCharge + gstOnBounce;
}

export function getEmiPaymentAmount(loan: Loan | null): number {
  const payEmiTotal = loan?.emiRepayment?.payEmi?.total;
  return typeof payEmiTotal === 'number' && Number.isFinite(payEmiTotal)
    ? Math.max(0, payEmiTotal)
    : 0;
}

export function getEmiAllDueAmount(loan: Loan | null): number {
  const payAllDueTotal = loan?.emiRepayment?.payAllDue?.total;
  return typeof payAllDueTotal === 'number' && Number.isFinite(payAllDueTotal)
    ? Math.max(0, payAllDueTotal)
    : 0;
}

function isForeclosedEmiLoan(loan: Loan | null): boolean {
  if (!loan) return false;
  const status = typeof loan.status === 'string' ? loan.status.trim().toUpperCase() : '';
  return loan.emiRepayment?.isClosed === true || loan.isForeclosed === true || status === 'FORECLOSED';
}

function getFirstPayableEmiBlock(loan: Loan | null): EmiRepaymentScheduleItem | null {
  const payableBlocks = getPayableEmiBlocks(loan);
  if (payableBlocks.length > 0) return payableBlocks[0];
  return getNextDueEmiBlock(loan);
}

export function getEmiRepaymentState(loan: Loan | null): EmiRepaymentState {
  const blocks = getSortedEmiSchedule(loan);
  if (blocks.length === 0) return 'no_schedule';
  if (isForeclosedEmiLoan(loan)) return 'foreclosed';

  const paidCount = getPaidEmiCount(loan);
  const overdueBlocks = blocks.filter(
    (block) => normalizeEmiStatus(block.status) === EMI_BLOCK_STATUS.overdue
  );
  const dueBlocks = blocks.filter(
    (block) => normalizeEmiStatus(block.status) === EMI_BLOCK_STATUS.due
  );
  const hasOnlyPaidBlocks = blocks.every(
    (block) => normalizeEmiStatus(block.status) === EMI_BLOCK_STATUS.paid
  );
  if (hasOnlyPaidBlocks) return 'all_paid';
  if (overdueBlocks.length > 0 && dueBlocks.length > 0) return 'overdue_and_due';
  if (overdueBlocks.length > 1) return 'multiple_overdue';

  const actionBlock = getFirstPayableEmiBlock(loan);
  const actionStatus = normalizeEmiStatus(actionBlock?.status);

  // This branch separates "first month" cases from later-cycle cases for clearer copy/actions.
  if (paidCount === 0 && actionBlock?.index === 0 && actionStatus === EMI_BLOCK_STATUS.due) {
    return 'first_emi_due';
  }
  if (paidCount === 0 && actionBlock?.index === 0 && actionStatus === EMI_BLOCK_STATUS.overdue) {
    return 'first_emi_overdue';
  }

  if (paidCount > 0 && actionStatus === EMI_BLOCK_STATUS.due) return 'some_paid_next_due';
  if (paidCount > 0 && actionStatus === EMI_BLOCK_STATUS.overdue) return 'some_paid_next_overdue';

  const hasPayableBlocks = overdueBlocks.length > 0 || dueBlocks.length > 0;
  if (!hasPayableBlocks) return 'no_due_yet';

  return 'unknown';
}

function getEmiBlockListLabel(blocks: EmiRepaymentScheduleItem[]): string {
  return blocks.map((block) => `EMI ${block.index + 1}`).join(' + ');
}

function getEmiDecisionSubtitle(
  state: EmiRepaymentState,
  payableBlocks: EmiRepaymentScheduleItem[],
  block: EmiRepaymentScheduleItem | null
): string {
  if (state === 'all_paid') return 'Your EMI schedule is completed';
  if (state === 'foreclosed') return 'This loan is already closed';
  if (state === 'no_due_yet' && block != null) {
    return `Next EMI unlocks on ${formatLoanDueDate(block.dueDate)}`;
  }

  // Payable blocks are the source of truth for the option chip copy.
  // This keeps single and combined payments consistent: EMI 1, EMI 1 + EMI 2, etc.
  if (payableBlocks.length > 0) {
    return `Pay all dues ${getEmiBlockListLabel(payableBlocks)}`;
  }

  return 'Pay your current due EMI';
}

export function getEmiPaymentDecision(loan: Loan | null): EmiPaymentDecision {
  const state = getEmiRepaymentState(loan);
  const payableBlocks = getPayableEmiBlocks(loan);
  const nextActionBlock = getFirstPayableEmiBlock(loan);
  const amount = getEmiPaymentAmount(loan);
  const allDueAmount = getEmiAllDueAmount(loan);
  const disabled = amount <= 0 || state === 'all_paid' || state === 'foreclosed';
  const allDueDisabled =
    payableBlocks.length < 2 ||
    allDueAmount <= 0 ||
    state === 'all_paid' ||
    state === 'foreclosed';

  const decision: EmiPaymentDecision = {
    state,
    amount,
    allDueAmount,
    title: 'Pay All Dues',
    subtitle: getEmiDecisionSubtitle(state, payableBlocks, nextActionBlock),
    footerLabel: nextActionBlock != null ? `EMI ${nextActionBlock.index + 1}` : 'Pay EMI',
    disabled,
    allDueDisabled,
    payableBlocks,
    nextActionBlock,
  };

  consoleLogDev(EMI_PAYMENT_LOG_TAG, {
    loanId: loan?._id,
    activeEmiIndex: loan?.emiRepayment?.activeEmiIndex,
    state: decision.state,
    payableAmount: decision.amount,
    allDueAmount: decision.allDueAmount,
    payableIndexes: decision.payableBlocks.map((block) => block.index),
    schedule: getSortedEmiSchedule(loan).map((block) => ({
      index: block.index,
      status: normalizeEmiStatus(block.status),
      dueDate: block.dueDate,
    })),
  });

  return decision;
}

export function isEmiBlockLocked(loan: Loan | null, block: EmiRepaymentScheduleItem): boolean {
  if (normalizeEmiStatus(block.status) === EMI_BLOCK_STATUS.paid) return false;
  if (typeof block.isLocked === 'boolean') return block.isLocked;
  const isPayable = getPayableEmiBlocks(loan).some(
    (payableBlock) => payableBlock.index === block.index
  );
  if (isPayable) return false;
  const nextDueBlock = getNextDueEmiBlock(loan);
  return nextDueBlock == null || block.index > nextDueBlock.index;
}

function buildEmiLockedMessage(block: EmiRepaymentScheduleItem): string {
  if (block.index <= 0) return 'Unlocks once earlier EMIs are paid';
  return `Unlocks once EMI ${block.index} is fully paid`;
}

/** Resolves the complete EMI lock presentation state from the repayment sequence. */
export function getEmiBlockLockState(
  loan: Loan | null,
  block: EmiRepaymentScheduleItem
): EmiBlockLockState {
  const locked = isEmiBlockLocked(loan, block);
  if (!locked) return { locked };
  return { locked, lockedMessage: buildEmiLockedMessage(block) };
}

/**
 * Returns status pill label for ACTIVE_LOAN_DASHBOARD card (top-right badge).
 * Uses dueDate: future → 'Active', today or past → 'Overdue'.
 * Isolated from other flows; fallback to 'Active' when loan/dueDate missing.
 */
export function getActiveLoanStatusPill(loan: Loan | null): 'Active' | 'Overdue' {
  if (!loan?.dueDate) return 'Active';
  return isDueDateInFuture(loan.dueDate) ? 'Active' : 'Overdue';
}

/** Resolves status pill for Active Loan card. Dev override takes precedence. */
export function resolveActiveLoanStatusPill(
  loan: Loan | null,
  devOverride: 'active' | 'overdue' | null
): 'Active' | 'Overdue' {
  if (devOverride) return devOverride === 'active' ? 'Active' : 'Overdue';
  return getActiveLoanStatusPill(loan);
}

/** Maps status pill label to variant for styling. */
export function statusPillToVariant(pill: 'Active' | 'Overdue'): 'active' | 'overdue' {
  return pill === 'Overdue' ? 'overdue' : 'active';
}

/**
 * Resolves display amount for loan status card.
 * Priority: loan amount → offer amount → dev mock (when useDevMockForActiveLoan).
 */
export function resolveCardDisplayAmount(
  loanAmount: number | undefined,
  offerAmount: number | undefined,
  options: { useDevMockForActiveLoan?: boolean }
): number | undefined {
  if (typeof loanAmount === 'number' && Number.isFinite(loanAmount)) return loanAmount;
  if (typeof offerAmount === 'number' && Number.isFinite(offerAmount)) return offerAmount;
  return options.useDevMockForActiveLoan ? 50000 : undefined;
}

/**
 * Amount due for display in Active Loan card.
 * EMI priority: emiRepayment pay-all-due total → remaining.
 * Payday priority: amountDue → emiAmount → totalPayable.
 */
export function getAmountDue(loan: Loan | null): number {
  if (!loan) return 0;
  if (isEmiLoan(loan)) {
    return getEmiPaymentAmount(loan) || getEmiRemainingAmount(loan);
  }
  if (typeof loan.amountDue === 'number' && Number.isFinite(loan.amountDue) && loan.amountDue > 0) {
    return loan.amountDue;
  }
  const emi = loan.emiAmount;
  const total = loan.totalPayable ?? getTotalPayable(loan);
  return typeof emi === 'number' && Number.isFinite(emi) ? emi : total;
}

/**
 * Resolves the total payable amount shown on the Payment (Make Payment) screen.
 *
 * Current rule: always use `loan.amountDue` — the authoritative outstanding balance from the API.
 *
 * Future: partial-payment logic, penalty caps, or post-tenure rules may apply here.
 * Update only this function when that logic changes — callers stay untouched.
 */
export function resolvePaymentTotalPayable(loan: Loan | null): number {
  if (!loan) return 0;
  if (isEmiLoan(loan)) {
    return getEmiPaymentAmount(loan);
  }
  if (typeof loan.amountDue === 'number' && Number.isFinite(loan.amountDue) && loan.amountDue > 0) {
    return loan.amountDue;
  }
  // Fallback until amountDue is live in the API
  // return getTotalPayable(loan);
  return 0
}

/**
 * Resolves the total payable amount shown on the Foreclosure screen.
 *
 * EMI priority: emiRepayment.foreclosure.total.
 * Payday priority: amountDue.
 *
 * Future: when tenure ends, a different penalty/post-due amount may apply.
 * Update only this function when that logic changes — callers stay untouched.
 */
export function resolveForeclosureTotalPayable(loan: Loan | null): number {
  if (!loan) return 0;
  if (isEmiLoan(loan)) {
    const foreclosureTotal = loan.emiRepayment?.foreclosure?.total;
    return typeof foreclosureTotal === 'number' && Number.isFinite(foreclosureTotal)
      ? Math.max(0, foreclosureTotal)
      : 0;
  }
  if (typeof loan.amountDue === 'number' && Number.isFinite(loan.amountDue) && loan.amountDue > 0) {
    return loan.amountDue;
  }
  // Fallback until amountDue is live in the API
  return 0;
}

/** Format a date string to "12 Feb 2026" style for display. */
export function formatLoanDueDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Build heading and description for ACTIVE_LOAN_DASHBOARD card from loan state (foreclosure vs overdue). */
export function buildActiveLoanCardContent(loan: Loan | null): {
  heading: string;
  description: string;
} {
  if (!loan || !isDisbursedLoan(loan)) {
    return {
      heading: 'Your loan is active',
      description:
        'Your loan is active. Close on time to avoid late fees and save on interest.',
    };
  }
  const screenType = resolveActiveLoanScreenType(loan);
  if (screenType === 'payment-emi') {
    const nextDueBlock = getNextDueEmiBlock(loan);
    const amount = getEmiPaymentAmount(loan) || getEmiMonthlyAmount(loan);
    const dueDateStr = nextDueBlock ? formatLoanDueDate(nextDueBlock.dueDate) : '';
    return {
      heading: `${formatCurrency(amount)} EMI Payment Due`,
      description: dueDateStr
        ? `Next EMI repayment is due on ${dueDateStr}.`
        : 'Please pay your active EMI on time to avoid late fees.',
    };
  }
  if (screenType === 'foreclosure') {
    const disbursedAt = loan.disbursedAt ?? loan.actualDisbursedAt ?? '';
    const disbursedLabel =
      disbursedAt ? formatLoanDueDate(disbursedAt) : 'disbursement';
    const amountStr = formatCurrency(loan.amount ?? 0);
    const dueDateStr = loan.dueDate ? formatLoanDueDate(loan.dueDate) : '';
    const description = dueDateStr
      ? `Next repayment due on ${dueDateStr}.`
      : 'Please repay on time to avoid late fees.';
    return {
      heading: `${amountStr} Credited Successfully on ${disbursedLabel}`,
      description,
    };
  }
  const totalPayable = getTotalPayable(loan);
  return {
    heading: 'Immediate Payment Required',
    description: `Your repayment of ${formatCurrency(totalPayable)} is significantly overdue. Please pay immediately to avoid further charges and impact on your credit profile.`,
  };
}

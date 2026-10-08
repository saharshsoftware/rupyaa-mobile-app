/**
 * Loan types based on API response structure.
 */

import type React from 'react';
import { logBureauPolicyResponseApp } from "../services/analytics/analyticsService";
import { ApiResponse } from "./api";
import { CurrentOfferOffer } from "./offer";
import { UserEligibilityExperianResponse } from "./user";

export type LoanStatus = 'Sanctioned' | 'Disbursed' | 'Completed' | 'Foreclosed' | 'Overdue' | string;
export type PaymentStatus = 'Pending' | 'Paid' | 'Overdue' | string;
export type LoanType = 'PAY_DAY' | 'CREDIT_BUILDER' | 'EMI' | string;

export const EMI_BLOCK_STATUS = {
  due: 'DUE',
  paid: 'PAID',
  overdue: 'OVERDUE',
  upcoming: 'UPCOMING',
} as const;

export type EmiBlockStatus = (typeof EMI_BLOCK_STATUS)[keyof typeof EMI_BLOCK_STATUS];

export interface EmiBlockLockState {
  locked: boolean;
  lockedMessage?: string;
}

export interface LoanFollowUp {
  lastAddedBy: string | null;
  status: boolean;
}

export interface EmiBlock {
  index: number;
  dueDate: string;
  emiAmount: number;
  openingPrincipal?: number;
  interestComponent: number;
  principalComponent: number;
  closingPrincipal?: number;
  status: EmiBlockStatus;
  isLocked?: boolean;
  overdueDays?: number;
  penalCharge?: number;
  gstOnPenal?: number;
  bounceCharge?: number;
  gstOnBounce?: number;
  payableTotal?: number;
}

export interface EmiRepaymentSummary {
  loanAmount: number;
  totalPayable: number;
  monthlyEmi: number;
  tenureMonths: number;
  interestRatePerMonth: number;
  processingFee: number;
  emisPaid: number;
  totalEmis: number;
  nextDueDate?: string | null;
  totalPaid: number;
  remaining: number;
}

export interface EmiRepaymentScheduleItem {
  index: number;
  dueDate: string;
  emiAmount: number;
  principal: number;
  interest: number;
  status: EmiBlockStatus;
  isLocked: boolean;
  overdueDays: number;
  penalCharge: number;
  gstOnPenal: number;
  bounceCharge: number;
  gstOnBounce: number;
  payableTotal: number;
}

export interface EmiRepaymentPaymentTotal {
  emiAmount: number;
  penalCharge: number;
  gstOnPenal: number;
  bounceCharge: number;
  gstOnBounce: number;
  total: number;
}

export interface EmiRepaymentPayAllDue {
  blocks: EmiRepaymentPaymentTotal[];
  total: number;
}

export interface EmiForeclosureBreakdown {
  outstandingPrincipal: number;
  interestTillClosure: number;
  foreclosureFee: number;
  gstOnForeclosureFee: number;
  penalCharge: number;
  gstOnPenal: number;
  bounceCharge: number;
  gstOnBounce: number;
  total: number;
}

export interface EmiRepayment {
  summary: EmiRepaymentSummary;
  schedule: EmiRepaymentScheduleItem[];
  payEmi: EmiRepaymentPaymentTotal;
  payAllDue: EmiRepaymentPayAllDue;
  foreclosure: EmiForeclosureBreakdown;
  activeEmiIndex: number;
  isClosed: boolean;
}

export interface Loan {
  _id: string;
  amount: number;
  tenure: string;
  dueDate: string;
  totalPayable: number;
  applicationNumber: string;
  createdAt: string;
  updatedAt: string;
  fee?: number;
  feePercentage?: number;
  reason?: string;
  status?: LoanStatus;
  interestRate?: number;
  interestRateAfterDueDate?: number;
  paymentStatus?: PaymentStatus;
  type?: LoanType;
  emiAmount?: number;
  emiDates?: string[];
  emiBlocks?: EmiBlock[];
  emiRepayment?: EmiRepayment;
  activeEmiIndex?: number;
  /** Total amount currently due for repayment. API field — will be populated once live. */
  amountDue?: number;
  bounceAmount?: number;
  totalPenaltyAmount?: number;
  totalAmountPaid?: number;
  paid?: boolean;
  isForeclosed?: boolean;
  autoVerificationCheckPass?: boolean;
  userName?: string;
  phoneNumber?: string;
  lendingNbfc?: string;
  disbursedAt?: string;
  actualDisbursedAt?: string;
  followUp?: LoanFollowUp;
  user?: string;
  isRiskyCustomer?: boolean;
  NPATransferredTo?: string;
  assignedTo?: string;
  isEdited?: boolean;
  logs?: unknown[];
  paymentRemindersSentOn?: unknown[];
  appliedVia?: string;
  afterDisbursalStatus?: string;
  isInLMS?: boolean;
  transactions?: string[];
  isSettlement?: boolean;
  isAuditDone?: boolean;
  duplicateFace?: boolean;
  nbfc?: unknown[];
  verdictGivenByAnalyzer?: string;
  bureauResult?: string;
  bsaResult?: string;
  userAgent?: string;
  ipAddress?: string;
  isSentInMIS?: boolean;
  waiverAmount?: number;
  isWaivered?: boolean;
  isReviewDone?: boolean;
  isInternal?: boolean;
  isTestLoan?: boolean;
  isTCVerificationDone?: boolean;
  processingFeeRefundAmount?: number;
  isBSAManual?: boolean;
  refundAmount?: number;
  telecallerOutcome?: string;
  telecallerVerificationPercentage?: number;
  subStatus?: string;
  category?: string;
  callCount?: number;
  autoDisbursalChecksPassed?: boolean;
  lastCallStatus?: string;
  lastCallDate?: string;
  platform?: string;
  policy?: string;
  source?: string;
  sanctionedPdfKey?: string;
  finalSignedContract?: string;
  assignedToPreCollection?: string;
  overdueSubstatus?: string;
  assignedNbfcCode?: string;
  editedLoanDetails?: unknown[];
  partialTransactions?: unknown[];
  emails?: unknown[];
  [key: string]: unknown;
}

export interface GetAllUserLoansResponse {
  message: string;
  loans: Loan[];
}

export interface GetExistingActiveLoanResponse {
  message: string;
  canCancel?: boolean;
  hasActiveLoan: boolean;
  loan: Loan | null;
  loanStatus: string;
  loanType?: LoanType;
}

export interface EmiPaymentContentProps {
  loan: Loan;
  ctaLoading?: boolean;
  ctaError?: string | null;
  onPayPress: (amount: number) => void;
  onForeclosePress: () => void;
}

export interface EmiProgressHeaderProps {
  loan: Loan;
}

export interface EmiRepaymentAccordionBreakdownRow {
  label: string;
  value: string;
  strong?: boolean;
}

export type EmiRepaymentAccordionStatusVariant = 'paid' | 'due' | 'overdue';

export interface EmiRepaymentAccordionItem {
  id: string;
  badgeLabel: string;
  title: string;
  dueLabel: string;
  amount: string;
  statusLabel?: string | null;
  statusVariant?: EmiRepaymentAccordionStatusVariant | null;
  breakdownRows: EmiRepaymentAccordionBreakdownRow[];
  totalLabel: string;
  totalValue: string;
  locked?: boolean;
  lockedMessage?: string;
  defaultExpanded?: boolean;
}

export interface EmiRepaymentAccordionProps {
  title?: string;
  items: EmiRepaymentAccordionItem[];
  allowToggle?: boolean;
  compact?: boolean;
  showExpandIndicator?: boolean;
}

export interface EmiRepaymentAccordionCardProps {
  item: EmiRepaymentAccordionItem;
  isExpanded: boolean;
  allowToggle: boolean;
  compact: boolean;
  showExpandIndicator: boolean;
  onToggle: () => void;
}

export interface EmiPaymentOptionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  subtitleVariant?: 'plain' | 'chip';
  onPress?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export type EmiRepaymentState =
  | 'no_schedule'
  | 'all_paid'
  | 'foreclosed'
  | 'no_due_yet'
  | 'first_emi_due'
  | 'first_emi_overdue'
  | 'some_paid_next_due'
  | 'some_paid_next_overdue'
  | 'multiple_overdue'
  | 'overdue_and_due'
  | 'unknown';

export interface EmiPaymentDecision {
  state: EmiRepaymentState;
  amount: number;
  allDueAmount: number;
  title: string;
  subtitle: string;
  footerLabel: string;
  disabled: boolean;
  allDueDisabled: boolean;
  payableBlocks: EmiRepaymentScheduleItem[];
  nextActionBlock: EmiRepaymentScheduleItem | null;
}

export interface EmiPaymentContentState {
  paymentDecision: EmiPaymentDecision;
  scheduleItems: EmiRepaymentAccordionItem[];
  ctaDisabled: boolean;
  showPayDueOption: boolean;
  isFirstEmiDue: boolean;
  isAllPaid: boolean;
  isNoDueYet: boolean;
  isOverdueAndDue: boolean;
}

export type ActiveEmiTileState = keyof typeof EMI_BLOCK_STATUS;

export interface ActiveEmiTile {
  id: string;
  title: string;
  subtitle: string;
  state: ActiveEmiTileState;
}

export interface ActiveEmiCardProps {
  loan: Loan | null;
  onPaymentPress: (amount: number) => void;
  ctaLoading?: boolean;
  ctaError?: string | null;
  ctaDisabled?: boolean;
  ctaLabel?: string;
  requirePayableAmount?: boolean;
}

export interface ActiveEmiTileProps {
  tile: ActiveEmiTile;
}

export interface ActiveLoanContentProps {
  loan: Loan | null;
  isLoading: boolean;
  error: Error | null;
  onForeclosePress?: (loanId: string, amount: number) => void | Promise<void>;
  onPaymentPress?: (loanId: string, amount: number) => void | Promise<void>;
  ctaLoading?: boolean;
  ctaError?: string | null;
}

export interface ActiveLoanCardProps {
  amount: number;
  amountDue?: number;
  dueDate: string;
  statusPill: 'Active' | 'Overdue';
  actionLabel: string;
  onActionPress?: () => void;
  disableAction?: boolean;
  showCancelLoanEntry?: boolean;
  canCancelLoan?: boolean;
  onCancelLoanPress?: () => void;
  loan?: Loan | null;
}

/** Success payload from POST /user/noc-request */
export interface LoanNocResponse {
  message?: string;
  url?: string;
  pdfKey?: string;
  status?: boolean;
}

/** Normalized NOC result for UI (open URL and/or show message). */
export interface ParsedLoanNocResult {
  openUrl: string | null;
  message: string | null;
}


export type SoftPullFlowNextAction = 'offer' | 'bank-statement';
export type SoftPullFlowErrorType =
  | 'ELIGIBILITY_REJECTED'
  | 'ELIGIBILITY_CHECK_FAILED'
  | 'UNEXPECTED';

export type SoftPullFlowError = {
  type: SoftPullFlowErrorType;
  message: string;
  canRetry: boolean;
  /** true when the API explicitly returns isEligible: false — triggers IneligibilityModal. */
  isIneligible?: boolean;
}

/**
 * Result of the soft pull eligibility check flow.
 * Determines the next navigation action based on eligibility and offer availability.
 */
export type SoftPullFlowSuccess = { success: true; nextAction: SoftPullFlowNextAction };
type SoftPullFlowFailure = { success: false; error: SoftPullFlowError };
export type SoftPullFlowResult = SoftPullFlowSuccess | SoftPullFlowFailure;

export type EligibilityErrorResolver = {
  type: Exclude<SoftPullFlowErrorType, 'UNEXPECTED'>;
  canRetry: boolean;
  matches: (response: ApiResponse<UserEligibilityExperianResponse>) => boolean;
  resolveMessage: (response: ApiResponse<UserEligibilityExperianResponse>) => string | undefined;
  fallbackMessage: string;
};

export type BureauPolicyAnalyticsPayload = Parameters<typeof logBureauPolicyResponseApp>[0];

export type BuildBureauPolicyAnalyticsPayloadParams = {
  eligibilityData?: UserEligibilityExperianResponse;
  offerPayload: CurrentOfferOffer;
  isReloan: boolean;
};

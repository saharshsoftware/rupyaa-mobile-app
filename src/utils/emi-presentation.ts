import type { EmiRepaymentAccordionItem, Loan } from '@/src/types';
import { formatCurrency } from './common-helper';
import {
  formatLoanDueDate,
  getEmiBlockLockState,
  getEmiMonthlyAmount,
  getEmiPaymentAmount,
  getNextDueEmiBlock,
  getSortedEmiSchedule,
  normalizeEmiStatus,
} from './loan-helpers';

export type EmiHomeStepState = 'paid' | 'due' | 'overdue' | 'upcoming';

export interface EmiHomePlanStep {
  id: string;
  title: string;
  state: EmiHomeStepState;
  statusLabel: string;
}

export interface EmiHomePlan {
  monthlyEmi: number;
  nextDueLabel: string;
  badgeLabel: string;
  steps: EmiHomePlanStep[];
  canPay: boolean;
}

function resolveEmiHomeStep(status: string, locked: boolean): Pick<EmiHomePlanStep, 'state' | 'statusLabel'> {
  if (status === 'PAID') return { state: 'paid', statusLabel: 'Paid' };
  if (status === 'OVERDUE') return { state: 'overdue', statusLabel: 'Overdue' };
  if (status === 'DUE') return { state: 'due', statusLabel: 'Due' };
  if (locked || status === 'UPCOMING' || status === '') return { state: 'upcoming', statusLabel: 'Upcoming' };
  return { state: 'due', statusLabel: 'Due' };
}

export function buildEmiHomePlan(loan: Loan): EmiHomePlan {
  const summary = loan.emiRepayment?.summary;
  const nextBlock = getNextDueEmiBlock(loan);
  const nextDueSource = summary?.nextDueDate || nextBlock?.dueDate || '';
  const nextDueLabel = formatEmiHomeDueDate(nextDueSource);
  const steps = getSortedEmiSchedule(loan).map((block) => {
    const status = normalizeEmiStatus(block.status);
    const lock = getEmiBlockLockState(loan, block);
    const presentation = resolveEmiHomeStep(status, lock.locked);
    return { id: String(block.index), title: `EMI ${block.index + 1}`, ...presentation };
  });
  const hasOverdue = steps.some((step) => step.state === 'overdue');
  const hasDue = steps.some((step) => step.state === 'due');
  const allPaid = steps.length > 0 && steps.every((step) => step.state === 'paid');
  let badgeLabel = 'Upcoming';
  if (hasOverdue) badgeLabel = 'Overdue';
  else if (hasDue) badgeLabel = 'Due';
  else if (allPaid || loan.emiRepayment?.isClosed === true) badgeLabel = 'Paid';
  const monthlyFromSummary = getEmiMonthlyAmount(loan);
  const monthlyEmi = monthlyFromSummary > 0 ? monthlyFromSummary : nextBlock?.emiAmount ?? 0;
  return {
    monthlyEmi,
    nextDueLabel: nextDueLabel.length > 0 ? nextDueLabel : '—',
    badgeLabel,
    steps,
    canPay: getEmiPaymentAmount(loan) > 0 && loan.emiRepayment?.isClosed !== true,
  };
}

function formatEmiHomeDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDueLabel(dueDate: string): string {
  const dueOn = formatLoanDueDate(dueDate);
  return dueOn.length > 0 ? `Due ${dueOn}` : 'Due';
}

export function buildEmiScheduleItems(loan: Loan): EmiRepaymentAccordionItem[] {
  return getSortedEmiSchedule(loan).map((block) => {
    const status = normalizeEmiStatus(block.status);
    const lock = getEmiBlockLockState(loan, block);
    const isPaid = status === 'PAID';
    const statusVariant = isPaid ? 'paid' : status === 'OVERDUE' ? 'overdue' : 'due';
    const charges = [
      { label: 'Penal charge', amount: block.penalCharge },
      { label: 'Bounce charge', amount: block.bounceCharge },
      { label: 'GST on charges', amount: block.gstOnPenal + block.gstOnBounce },
    ].filter((row) => row.amount > 0);
    const isCurrentDue = !lock.locked && (status === 'DUE' || status === 'OVERDUE');
    return {
      id: String(block.index),
      badgeLabel: String(block.index + 1),
      title: `EMI ${block.index + 1}`,
      dueLabel: formatDueLabel(block.dueDate),
      amount: formatCurrency(block.emiAmount, true),
      statusLabel: status === 'UPCOMING' ? null : status,
      statusVariant,
      ...lock,
      defaultExpanded: isCurrentDue,
      breakdownRows: [
        { label: 'Principal', value: formatCurrency(block.principal, true) },
        { label: 'Interest', value: formatCurrency(block.interest, true) },
        ...charges.map((row) => ({ label: row.label, value: formatCurrency(row.amount, true) })),
      ],
      totalLabel: 'EMI total',
      totalValue: formatCurrency(block.payableTotal ?? block.emiAmount, true),
    };
  });
}

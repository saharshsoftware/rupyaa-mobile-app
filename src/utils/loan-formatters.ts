import type { Loan } from '@/src/types/loans';
import { LOAN_TYPE } from '@/src/types/loans';

/**
 * Loan-related formatting utilities.
 */

/**
 * Format date from ISO string to "DD MMM YYYY" format (e.g., "01 Jun 2025").
 */
export function formatLoanDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Application identifier for display (e.g. "Application: #2N4CM1Z").
 */
export function getApplicationDisplay(loan: Loan): string {
  const appId = loan.applicationNumber?.trim() || loan._id?.slice(-7) || 'N/A';
  return appId.startsWith('#') ? `Application: ${appId}` : `Application: #${appId}`;
}

/**
 * Best available disbursed date for display (disbursedAt → actualDisbursedAt → createdAt).
 */
export function getDisbursedDateString(loan: Loan): string {
  const raw = loan.disbursedAt ?? loan.actualDisbursedAt ?? loan.createdAt;
  if (!raw) return 'N/A';
  return formatLoanDate(raw);
}

/**
 * Get loan type display name.
 */
export function getLoanTypeDisplayName(type: string): string {
  const normalizedType = type.trim().toUpperCase();
  if (normalizedType === LOAN_TYPE.payDay || normalizedType === LOAN_TYPE.bullet) {
    return 'Bullet Loan';
  }

  switch (type) {
    case LOAN_TYPE.creditBuilder:
      return 'Credit Builder Loan';
    case LOAN_TYPE.emi:
    case 'emi':
      return 'EMI Loan';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

/**
 * Get payment status chip variant for UI display.
 */
export function getPaymentStatusVariant(status: string): 'warning' | 'success' | 'error' | 'default' {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'warning';
    case 'paid':
      return 'success';
    case 'overdue':
      return 'error';
    default:
      return 'default';
  }
}

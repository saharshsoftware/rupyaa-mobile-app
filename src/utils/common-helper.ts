import { Alert, Dimensions } from 'react-native';
import { Loan } from '../types/loans';
import { appConfig } from '../config/appConfig';

export { consoleLogDev } from './consoleLogDev';

export const commingSoonHandler = () => {
    Alert.alert('Coming Soon', 'This feature is coming soon. Please check back later.');
}

/**
 * Extract user-friendly error message from unknown error.
 * Handles Error instances, API error shape { message }, and fallback.
 */
export const errorHandler = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
};

type ApiErrorShape = {
  message?: string;
  details?: unknown | Record<string, unknown>;
  passwordInvalid?: boolean;
  /** Top-level error string (e.g. from email verification API). */
  error?: string;
};

/** User-friendly message when email sending fails due to sender not verified (e.g. SES in AP-SOUTH-1). */
const EMAIL_SENDER_NOT_VERIFIED_MESSAGE =
  "We're unable to send the verification email right now. Please try again later or contact support.";

/**
 * Detect email verification API error when sender identity is not verified (e.g. AWS SES).
 * API returns: { message: "An error occurred...", error: "Message failed: 554 Message rejected: Email address is not verified..." }
 */
function getEmailVerificationApiErrorMessage(details: unknown): string | null {
  if (!details || typeof details !== 'object') return null;
  const record = details as Record<string, unknown>;
  const errorStr = record.error;
  if (typeof errorStr !== 'string' || !errorStr.trim()) return null;
  const lower = errorStr.toLowerCase();
  if (
    lower.includes('email address is not verified') ||
    lower.includes('554 message rejected')
  ) {
    return EMAIL_SENDER_NOT_VERIFIED_MESSAGE;
  }
  return null;
}

/**
 * Extract user-friendly message from API error response.
 * Prefers nested details.message when available (e.g. 403 with specific rejection reason).
 * Handles email verification API sender-not-verified error with a friendly message.
 */
export function getApiErrorDisplayMessage(error: ApiErrorShape | null | undefined): string {
  if (!error) return '';
  const details = error.details;

  // Handle known email verification / sender-not-verified error first
  const emailVerifyMsg = getEmailVerificationApiErrorMessage(details);
  if (emailVerifyMsg) return emailVerifyMsg;

  const detailsMessage = getDetailsMessage(details);
  if (detailsMessage) return detailsMessage;

  const rejectionMessage = getRejectionMessage(details);
  if (rejectionMessage) return rejectionMessage;

  if (details && typeof details === 'object') {
    const record = details as Record<string, unknown>;
    const candidates = [
      record.rejectReason,
      record.rejectionReason,
      record.reject_reason,
      record.reason,
      // Some APIs return a generic `error` field (e.g. { error: "Internal server error" }).
      record.error,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
  }
  return error.message ?? '';
}

const getDetailsMessage = (details: unknown): string => {
  if (!details || typeof details !== 'object') return '';

  const message = (details as Record<string, unknown>).message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    for (const entry of message) {
      if (typeof entry === 'string' && entry.trim()) {
        return entry;
      }
    }
  }

  if (message && typeof message === 'object') {
    const nestedMessage = (message as Record<string, unknown>).message;
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage;
    }
  }

  return '';
};

const formatRejectionKey = (key: string) => {
  const withSpaces = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const extractRejectionFlags = (data: unknown): Record<string, boolean> | null => {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const candidates = [
    record.rejectionReason,
    record.rejectReason,
    record.rejection_reason,
    record.reject_reason,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate as Record<string, boolean>;
    }
  }
  return null;
};

export const getRejectionReasons = (data: unknown): string[] => {
  const flags = extractRejectionFlags(data);
  if (!flags) return [];
  return Object.entries(flags)
    .filter(([, value]) => value === true)
    .map(([key]) => formatRejectionKey(key));
};

export function getRejectionMessage(data: unknown): string {
  const reasons = getRejectionReasons(data);
  if (reasons.length > 0) {
    return `We can't proceed due to: ${reasons.join(', ')}.`;
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const candidates = [
      record.rejectReason,
      record.rejectionReason,
      record.reject_reason,
      record.reason,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate;
      }
    }
  }
  return '';
}

/** Format number as Indian-style currency string (e.g. ₹70,000). */
export function formatCurrency(
  amount: number,
  showSymbol: boolean = true,
  fractionDigits: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {},
): string {
  const formatted = amount.toLocaleString('en-IN', fractionDigits);
  return showSymbol ? `₹${formatted}` : formatted;
}

/** Convert dd/mm/yyyy (form input) to yyyy-mm-dd (API format). */
export const convertDdMmYyyyToIso = (dob: string): string => {
  const parts = dob.split('/');
  if (parts.length !== 3) return dob;
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
}

/**
 * Insert line breaks after commas for display (e.g. "Hello, World" -> "Hello,\nWorld").
 */
export const breakTextOnComma = (text: string): string => {
  if (!text || !text.includes(',')) return text;
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0) return text;
  if (parts.length === 1) return `${parts[0]},`;
  const withCommas = parts.map((part, index) =>
    index < parts.length - 1 ? `${part},` : part
  );
  return withCommas.join('\n');
};


export function getTotalPayable(loan: Loan): number {
  return (
    loan.totalPayable ??
    (loan.emiAmount || 0) +
      (loan.bounceAmount || 0) +
      (loan.totalPenaltyAmount || 0)
  );
}

export const windowHeight = Dimensions.get('window').height;

export const SUCCESS_MODAL_AUTO_NEXT_DELAY_MS = 1500;  // 1.5 seconds

export function buildWhatsAppUrlFromNumber(): string | null {
  const digits = appConfig.contactUsWhatsAppNumber.replace(/\D/g, '');
  if (digits.length < 10) {
    return null;
  }
  return `https://wa.me/${digits}`;
}

export function resolveWhatsAppUrl(): string | null {
  const configured = appConfig.whatsappSupportUrl?.trim();
  if (configured) {
    return configured;
  }
  return buildWhatsAppUrlFromNumber();
}

/**
 * Removes backend-internal stack traces when APIs append them after `|<newline>` or `\nStack:`.
 * Keeps only the user-facing line(s), e.g. mandate cooldown messages from `/mandates`.
 */
export function scrubApiErrorStringForDisplay(text: string): string {
  let s = text.trim();
  if (!s) return s;

  const pipeBreak = s.split(/\|\s*\r?\n/);
  if (pipeBreak.length > 1) {
    s = pipeBreak[0].trim();
  }

  const stackIdx = s.search(/\r?\n\s*Stack:/i);
  if (stackIdx !== -1) {
    s = s.slice(0, stackIdx).trim();
  }

  return s.replace(/\|\s*$/g, "").trim();
}

/**
 * Reads user-visible error text from common API JSON shapes (`message`, string `error`,
 * or nested `error.message`). String bodies may include appended stacks — see {@link scrubApiErrorStringForDisplay}.
 */
export function extractApiUserMessage(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const o = parsed as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) {
    return scrubApiErrorStringForDisplay(o.message);
  }
  if (typeof o.error === "string" && o.error.trim()) {
    return scrubApiErrorStringForDisplay(o.error);
  }
  if (o.error && typeof o.error === "object" && o.error !== null) {
    const inner = (o.error as Record<string, unknown>).message;
    if (typeof inner === "string" && inner.trim()) {
      return scrubApiErrorStringForDisplay(inner);
    }
  }
  return undefined;
}
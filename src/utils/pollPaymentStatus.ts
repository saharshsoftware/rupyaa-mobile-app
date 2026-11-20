import { paymentService } from '@/src/services/payment/paymentService';
import type { PaymentOrderStatus } from '@/src/types/payment';

/** Poll interval while order is PENDING (awaiting gateway / UPI settlement). */
const POLL_INTERVAL_MS = 3000;

/** Keep polling for up to 5 minutes for PENDING. */
const MAX_DURATION_MS = 5 * 60 * 1000;

function createAbortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Aborted', 'AbortError');
  }
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

function createUnexpectedStatusError(status: string): Error {
  return new Error(`Unexpected payment order status: ${status}`);
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Polls order status until backend reports a terminal state or max duration.
 * - PENDING: keep polling (payment may still settle after returning from UPI).
 * - SUCCESS / FAILED: stop and return that status.
 * - Aborts cleanly when `signal` is aborted (e.g. screen unmount).
 */
export async function pollPaymentStatus(
  orderId: string,
  signal: AbortSignal
): Promise<PaymentOrderStatus> {
  const startTime = Date.now();

  while (true) {
    if (signal.aborted) {
      throw createAbortError();
    }

    const result = await paymentService.getPaymentOrderStatus(orderId);
    if (!result.success || result.data == null) {
      const message =
        result.success === false ? result.error.message : 'Failed to fetch order status';
      throw new Error(message);
    }

    const status = result.data.status;

    if (status === 'SUCCESS' || status === 'FAILED') {
      return status;
    }

    if (status !== 'PENDING') {
      throw createUnexpectedStatusError(String(status));
    }

    // PENDING: keep polling up to 5 minutes.
    if (Date.now() - startTime > MAX_DURATION_MS) {
      throw new Error('Payment is still pending. Please try again after some time.');
    }

    await delay(POLL_INTERVAL_MS, signal);
  }
}

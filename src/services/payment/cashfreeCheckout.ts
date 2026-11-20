// TODO (iOS): Verify Cashfree iOS SDK setup before enabling payments on iOS:
//   1. Confirm `react-native-cashfree-pg-sdk` Podspec links correctly (run `pod install` after prebuild).
//   2. UPI redirect URL schemes live in app.json ios.infoPlist LSApplicationQueriesSchemes
//      (e.g. "gpay", "phonepe", "paytm") so the SDK can detect which UPI apps are installed.
//   3. The withCashfreeSubscription plugin (plugins/withCashfreeSubscription.js) is Android-only —
//      check Cashfree iOS docs for any equivalent Info.plist / entitlement requirements.
//   4. Test a full drop-checkout + E-NACH flow on an iOS simulator and physical device.
import {
  CFPaymentGatewayService,
  type CFErrorResponse,
} from 'react-native-cashfree-pg-sdk';
import {
  CFEnvironment,
  CFSession,
  CFSubscriptionSession,
  CFDropCheckoutPayment,
  CFPaymentComponentBuilder,
  CFPaymentModes,
} from 'cashfree-pg-api-contract';
import { getCashfreeEnachEnvironmentRaw, getCashfreeEnvironmentRaw } from '@/src/config/resolvedAppConfig';

export interface CashfreeCheckoutCallbacks {
  onVerify?: (orderId: string) => void;
  onError?: (message: string, orderId: string) => void;
}

/** Maps a raw environment string to CFEnvironment; defaults to PRODUCTION for unknown values. */
function mapToCashfreeEnvironment(raw: string): CFEnvironment {
  return raw === 'SANDBOX' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
}

/** Resolves CFEnvironment from generic app-config cashfreEnvironment; defaults to PRODUCTION for unknown values. */
function getCashfreeEnvironment(): CFEnvironment {
  return mapToCashfreeEnvironment(getCashfreeEnvironmentRaw());
}

/** Resolves CFEnvironment from app-config cashFreeEnachEnvironment for E-NACH; falls back safely via resolvedAppConfig. */
function getCashfreeSubscriptionEnvironment(): CFEnvironment {
  return mapToCashfreeEnvironment(getCashfreeEnachEnvironmentRaw());
}

/**
 * Opens Cashfree Drop Checkout for one-time payment using order_id and payment_session_id.
 * Sets gateway callback for onVerify/onError, then calls doPayment.
 * Callbacks are cleared after invocation to avoid leaks.
 */
export function openCashfreePaymentCheckout(
  paymentSessionId: string,
  orderId: string,
  callbacks: CashfreeCheckoutCallbacks = {}
): void {
  const { onVerify, onError } = callbacks;

  CFPaymentGatewayService.setCallback({
    onVerify(orderID: string): void {
      CFPaymentGatewayService.removeCallback();
      onVerify?.(orderID);
    },
    onError(error: CFErrorResponse, orderID: string): void {
      CFPaymentGatewayService.removeCallback();
      const message = error?.getMessage?.() ?? 'Payment failed. Please try again.';
      onError?.(message, orderID);
    },
  });

  try {
    const session = new CFSession(
      paymentSessionId,
      orderId,
      getCashfreeSubscriptionEnvironment()
    );
    const paymentModes = null
    // new CFPaymentComponentBuilder()
    //   .add(CFPaymentModes.CARD)
    //   .add(CFPaymentModes.UPI)
    //   .add(CFPaymentModes.NB)
    //   .add(CFPaymentModes.WALLET)
    //   .add(CFPaymentModes.PAY_LATER)
    //   .build();
    const dropPayment = new CFDropCheckoutPayment(session, paymentModes, null);
    CFPaymentGatewayService.doPayment(dropPayment);
  } catch (e: unknown) {
    CFPaymentGatewayService.removeCallback();
    const message = e instanceof Error ? e.message : 'Unable to start checkout. Please try again.';
    onError?.(message, orderId);
  }
}

/**
 * Opens Cashfree E-NACH / subscription payment using sessionId and subscriptionId from createMandate.
 * Sets gateway callback for onVerify/onError, then calls doSubscriptionPayment.
 * Callbacks are cleared after invocation to avoid leaks.
 */
export function openCashfreeSubscriptionCheckout(
  sessionId: string,
  subscriptionId: string,
  callbacks: CashfreeCheckoutCallbacks = {}
): void {
  const { onVerify, onError } = callbacks;

  CFPaymentGatewayService.setCallback({
    onVerify(orderID: string): void {
      CFPaymentGatewayService.removeCallback();
      onVerify?.(orderID);
    },
    onError(error: CFErrorResponse, orderID: string): void {
      CFPaymentGatewayService.removeCallback();
      const message = error?.getMessage?.() ?? 'E-NACH authorization failed. Please try again.';
      onError?.(message, orderID);
    },
  });

  try {
    const session = new CFSubscriptionSession(
      sessionId,
      subscriptionId,
      getCashfreeSubscriptionEnvironment()
    );
    CFPaymentGatewayService.doSubscriptionPayment(session);
  } catch (e: unknown) {
    CFPaymentGatewayService.removeCallback();
    const message = e instanceof Error ? e.message : 'Unable to start E-NACH checkout. Please try again.';
    onError?.(message, '');
  }
}

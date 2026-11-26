/**
 * HTTPS partner handoff URL returned after a rejected loan application.
 */
export type RejectionRedirectUrl = string;

/**
 * Raw DSA rejection-redirect payload from GET /dsa/offers/rejection-redirect.
 */
export interface RejectionRedirectResponse {
  success: boolean;
  redirectUrl?: RejectionRedirectUrl;
}

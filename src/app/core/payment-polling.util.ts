import { ApiService } from './api.service';
import { Order } from './order.model';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30;

export type PaymentPollResult =
  | { status: 'succeeded'; order: Order }
  | { status: 'failed'; error?: string }
  | { status: 'timeout' };

interface StatusResponse {
  status: 'processing' | 'succeeded' | 'failed';
  order?: Order;
  error?: string;
}

/**
 * Shared by Checkout's in-app native flow (§3.5 of the mobile port plan) and
 * CheckoutReturn's web-redirect flow — ported from the polling loop in
 * frontend/src/pages/CheckoutReturn.jsx (2s interval, 30 attempts / ~60s).
 */
export async function pollPaymentStatus(api: ApiService, pendingCheckoutId: string): Promise<PaymentPollResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await api.get<StatusResponse>(`/payments/status/${pendingCheckoutId}`);
      if (result.status === 'succeeded' && result.order) {
        return { status: 'succeeded', order: result.order };
      }
      if (result.status === 'failed') {
        return { status: 'failed', error: result.error };
      }
    } catch {
      return { status: 'failed' };
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return { status: 'timeout' };
}

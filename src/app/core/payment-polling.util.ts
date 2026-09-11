import { ApiService } from './api.service';
import { Booking } from './booking.model';
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

export type BookingPaymentPollResult =
  | { status: 'succeeded'; booking: Booking }
  | { status: 'failed'; error?: string }
  | { status: 'timeout' };

interface BookingStatusResponse {
  status: 'processing' | 'succeeded' | 'failed';
  booking?: Booking;
  error?: string;
}

/**
 * Same shape as pollPaymentStatus, but for /bookings/status — used by
 * ServiceBook's in-app native flow and BookingReturn's web-redirect flow.
 * Ported from the polling loop in frontend/src/pages/BookingReturn.jsx.
 */
export async function pollBookingPaymentStatus(api: ApiService, pendingBookingId: string): Promise<BookingPaymentPollResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await api.get<BookingStatusResponse>(`/bookings/status/${pendingBookingId}`);
      if (result.status === 'succeeded' && result.booking) {
        return { status: 'succeeded', booking: result.booking };
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

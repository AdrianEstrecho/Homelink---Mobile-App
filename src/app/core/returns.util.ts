/**
 * Ported from frontend/src/utils/returns.js, which itself mirrors backend/utils/returns.js —
 * kept in sync by hand, since the app and the backend don't share a module.
 */
export const RETURN_WINDOW_DAYS = 7;
export const MAX_RETURN_PHOTOS = 3;

export type ReturnKind = 'return' | 'cancellation';
export type ReturnStatus = 'pending' | 'approved' | 'received' | 'rejected' | 'cancelled';
export type RefundStatus = 'unpaid' | 'refunded' | 'not_applicable';

export interface ReturnItem {
  quantity: number;
  unit_price: number;
  name: string;
  image: string;
  slug: string;
}

/** A row of GET /returns/my — returns and cancellation refunds share the one queue. */
export interface ReturnRequest {
  id: string;
  order_id: string;
  kind: ReturnKind;
  reason: string;
  status: ReturnStatus;
  refund_amount: number;
  refund_status: RefundStatus;
  review_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  received_at?: string | null;
  refunded_at?: string | null;
  payment_method?: string | null;
  photo_count: number;
  ref: string;
  items: ReturnItem[];
}

export interface ReturnableLine {
  orderItemId: string;
  productId: string;
  name: string;
  image: string;
  orderedQty: number;
  committedQty: number;
  returnableQty: number;
  unitPrice: number;
}

/** GET /returns/eligibility/:orderId */
export interface ReturnEligibility {
  eligible: boolean;
  reason?: 'not_delivered' | 'window_closed' | 'fully_returned' | null;
  windowClosesAt?: string | null;
  refundable?: boolean;
  lines: ReturnableLine[];
}

export const orderRef = (id: string) => `#${String(id).slice(0, 8).toUpperCase()}`;

/** A 'return' sends delivered goods back; a 'cancellation' is the refund owed when a customer
 *  cancels an order they had already paid for online. */
export const caseRef = (id: string, kind: ReturnKind = 'return') =>
  `${kind === 'cancellation' ? 'CAN' : 'RET'}-${String(id).slice(0, 8).toUpperCase()}`;

export const isCancellation = (r: { kind?: ReturnKind } | null | undefined) => r?.kind === 'cancellation';

export const KIND_LABEL: Record<ReturnKind, string> = { return: 'Return', cancellation: 'Cancellation' };
export const KIND_STYLE: Record<ReturnKind, string> = {
  return: 'bg-orange-100 text-orange-800',
  cancellation: 'bg-rose-100 text-rose-800',
};

export const RETURN_STATUS_STYLE: Record<ReturnStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  received: 'Received',
  rejected: 'Not Approved',
  cancelled: 'Cancelled',
};

// A cancellation refund walks the same statuses but means something different at each one, so
// "Approved" alone would tell the customer nothing about whether their money has moved.
const CANCELLATION_STATUS_LABEL: Record<ReturnStatus, string> = {
  pending: 'Refund Pending Review',
  approved: 'Refund Approved',
  received: 'Refund Approved',
  rejected: 'Refund Not Approved',
  cancelled: 'Cancelled',
};

export const statusLabel = (kind: ReturnKind, status: ReturnStatus) =>
  (kind === 'cancellation' ? CANCELLATION_STATUS_LABEL : RETURN_STATUS_LABEL)[status] || status;

// What the customer should do next, shown under the badge so a status is never just a colour.
const RETURN_STATUS_HINT: Record<ReturnStatus, string> = {
  pending: 'Our team is reviewing your request. Please hold on to the items for now.',
  approved: 'Approved — please send the items back to us so we can complete your refund.',
  received: 'We’ve received your items. Refunds take 5-10 business days to reach your account.',
  rejected: 'This request wasn’t approved. See the note from our team below.',
  cancelled: 'This request was cancelled.',
};

// Nothing is ever shipped back on a cancellation, so every line here is about the money.
const CANCELLATION_STATUS_HINT: Record<ReturnStatus, string> = {
  pending: 'Your order is cancelled. Our team is reviewing the refund — there’s nothing for you to send back.',
  approved: 'Your refund has been approved and is on its way back to you.',
  received: 'Your refund has been approved and is on its way back to you.',
  rejected: 'This refund wasn’t approved. See the note from our team below.',
  cancelled: 'This refund request was cancelled.',
};

export const statusHint = (kind: ReturnKind, status: ReturnStatus) =>
  (kind === 'cancellation' ? CANCELLATION_STATUS_HINT : RETURN_STATUS_HINT)[status] || '';

const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  unpaid: 'Refund pending',
  refunded: 'Refunded',
  not_applicable: 'No payment to refund',
};

const CANCELLATION_REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  unpaid: 'Refund not sent yet',
  refunded: 'Refund sent',
  not_applicable: 'No payment to refund',
};

export const refundStatusLabel = (kind: ReturnKind, refundStatus: RefundStatus) =>
  (kind === 'cancellation' ? CANCELLATION_REFUND_STATUS_LABEL : REFUND_STATUS_LABEL)[refundStatus] || refundStatus;

/** Reason codes from GET /returns/eligibility/:orderId. */
export const INELIGIBLE_MESSAGE: Record<string, string> = {
  not_delivered: 'This order can be returned once it has been delivered.',
  window_closed: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed.`,
  fully_returned: 'Every item on this order has already been requested for return.',
};

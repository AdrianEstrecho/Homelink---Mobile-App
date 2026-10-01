export type PaymentMethodValue = 'card' | 'gcash' | 'qrph' | 'bank' | 'cod';

export interface PaymentMethodDef {
  value: PaymentMethodValue;
  label: string;
  description: string;
  /** Handed off to PayMongo's hosted page; the order is only created once the charge is confirmed. */
  gateway: boolean;
  /** Hidden wherever nothing is being delivered — service bookings share the picker. */
  deliveryOnly?: boolean;
}

/**
 * Ported from frontend/src/constants/paymentMethods.js. The non-gateway methods collect money
 * outside the app, so their order is created immediately with payment_status 'pending'
 * (see backend/routes/orders.js).
 */
export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { value: 'card', label: 'Credit / Debit Card', description: 'Visa, Mastercard & more', gateway: true },
  { value: 'gcash', label: 'GCash', description: 'Pay with your wallet', gateway: true },
  { value: 'qrph', label: 'QR Ph', description: 'Scan with any app', gateway: true },
  { value: 'bank', label: 'Bank Transfer', description: 'Direct bank deposit', gateway: false },
  { value: 'cod', label: 'Cash on Delivery', description: 'Pay the rider in cash', gateway: false, deliveryOnly: true },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

/** Orders and bookings store the wire value ('gcash', 'qrph', 'cod'), which CSS `capitalize`
 *  renders as "Gcash", "Qrph" and "Cod" on receipts and order details. */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '';
  return PAYMENT_METHOD_LABELS[method] || method.charAt(0).toUpperCase() + method.slice(1);
}

/** True for the methods that skip PayMongo entirely, so checkout POSTs straight to /orders. */
export function isOfflinePayment(method: string): boolean {
  return PAYMENT_METHODS.some((m) => m.value === method && !m.gateway);
}

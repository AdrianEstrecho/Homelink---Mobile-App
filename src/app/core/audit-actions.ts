// Ported from frontend/src/data/auditActions.js — turns an audit_logs row's action + details
// payload into a readable sentence. Must stay in sync by hand with the actions the backend's
// logActivity() calls write (backend/routes/*.js); an action missing here just shows its raw key.
import { POSITION_LABELS } from './admin.model';
import { formatTicketNo } from './ticket-number.util';

export type AuditCategory = 'create' | 'update' | 'delete' | 'login' | 'archive';
type Details = Record<string, any>;
type NameOf = (id: string) => string | null | undefined;

interface ActionMeta {
  category: AuditCategory;
  entity: string;
  describe: (d: Details, nameOf?: NameOf) => string;
}

const ROLE_LABELS: Record<string, string> = { admin: 'Administrator', employee: 'Employee' };

const peso = (n: unknown) => `₱${Number(n || 0).toLocaleString('en-PH')}`;
const plural = (n: unknown, word: string) => `${word}${n === 1 ? '' : 's'}`;
const ticket = (d: Details) => (d['ticketNumber'] ? formatTicketNo(d['ticketNumber']) : '');

export const ACTION_META: Record<string, ActionMeta> = {
  'auth.login': { category: 'login', entity: 'User', describe: () => 'Logged in' },
  'auth.password_reset_request': { category: 'update', entity: 'User', describe: (d) => `${d['name'] || d['email']} forgot their password and is waiting for approval` },
  'auth.password_reset_approve': { category: 'update', entity: 'User', describe: (d) => `Approved a password reset for ${d['name'] || d['email']} and issued a reset code` },
  'auth.password_reset': { category: 'update', entity: 'User', describe: (d) => `Changed their password using a reset code (${d['email']})` },
  'user.create': {
    category: 'create',
    entity: 'User',
    describe: (d) =>
      `Created user ${d['email']}${d['role'] ? ` (${ROLE_LABELS[d['role']] || d['role']}${d['position'] ? `, ${POSITION_LABELS[d['position']] || d['position']}` : ''})` : ''}`,
  },
  'user.promote': { category: 'update', entity: 'User', describe: (d) => `Promoted ${d['email']} to ${POSITION_LABELS[d['toPosition']] || d['toPosition']}` },
  'user.delete': { category: 'delete', entity: 'User', describe: (d) => `Deleted user ${d['email']}` },
  'user.archive': { category: 'archive', entity: 'User', describe: (d) => `Archived user ${d['email']}` },
  'user.restore': { category: 'archive', entity: 'User', describe: (d) => `Restored user ${d['email']}` },
  'booking.create': {
    category: 'create',
    entity: 'Booking',
    describe: (d) => `${d['customerName'] || 'A customer'} booked ${d['serviceName'] || 'a service'}${d['scheduledDate'] ? ` for ${d['scheduledDate']}` : ''}`,
  },
  'booking.status_update': {
    category: 'update',
    entity: 'Booking',
    describe: (d) => `Status changed: ${d['from'] || '—'} → ${d['to']}${d['completionNotes'] ? ` · "${d['completionNotes']}"` : ''}`,
  },
  'booking.completed': {
    category: 'update',
    entity: 'Booking',
    describe: (d) =>
      `${d['serviceName'] || 'Service'} for ${d['customerName'] || 'a customer'} marked Installed Completed by ${d['installerName'] || 'installer'}${d['completionNotes'] ? ` · "${d['completionNotes']}"` : ''}`,
  },
  'booking.assign': { category: 'update', entity: 'Booking', describe: (d, nameOf) => `Assigned to ${nameOf?.(d['toEmployeeId']) || '—'}` },
  'booking.unassign': { category: 'update', entity: 'Booking', describe: (d, nameOf) => `Unassigned from ${nameOf?.(d['fromEmployeeId']) || '—'}` },
  'booking.cancel': {
    category: 'update',
    entity: 'Booking',
    describe: (d) => `${d['customerName'] || 'A customer'} cancelled their booking${d['reason'] ? ` — "${d['reason']}"` : ''}`,
  },
  'booking.needs_review': {
    category: 'update',
    entity: 'Booking',
    describe: (d) => `Flagged ${d['customerName'] ? `${d['customerName']}'s` : 'a'} paid booking for review — ${d['reason']}`,
  },
  'order.create': {
    category: 'create',
    entity: 'Order',
    describe: (d) => `${d['customerName'] || 'A customer'} placed an order for ${d['itemCount'] || ''} ${plural(d['itemCount'], 'item')} (${peso(d['total'])})`,
  },
  'order.status_update': { category: 'update', entity: 'Order', describe: (d) => `Status changed: ${d['from'] || '—'} → ${d['to']}` },
  'order.cancel': {
    category: 'update',
    entity: 'Order',
    describe: (d) => `${d['customerName'] || 'A customer'} cancelled their order${d['reason'] ? ` — "${d['reason']}"` : ''}`,
  },
  'order.complete': {
    category: 'create',
    entity: 'Order',
    describe: (d) => `${d['customerName'] || 'A customer'} confirmed order #${d['orderRef']} as completed — returns closed`,
  },
  'order.needs_review': {
    category: 'update',
    entity: 'Order',
    describe: (d) => `Flagged ${d['customerName'] ? `${d['customerName']}'s` : 'a'} paid order for review — ${d['reason']}`,
  },
  'order.stock_returned': {
    category: 'update',
    entity: 'Order',
    describe: (d) => `Returned ${d['units'] || 0} ${plural(d['units'], 'unit')} to stock after the order was cancelled`,
  },
  'order.stock_reserved': {
    category: 'update',
    entity: 'Order',
    describe: (d) => `Took ${d['units'] || 0} ${plural(d['units'], 'unit')} back out of stock after the cancelled order was reinstated`,
  },
  // Older entries, from before paid orders carried their own needs_review flag.
  'order.oversold_after_payment': { category: 'update', entity: 'Order', describe: () => 'An item sold out while the customer was paying — needs review' },
  // d.kind is 'cancellation' for a refund raised by a customer cancelling an order they had
  // already paid for. Entries written before that existed carry no kind and read as returns.
  'return.create': {
    category: 'create',
    entity: 'Return',
    describe: (d) =>
      d['kind'] === 'cancellation'
        ? `${d['customerName'] || 'A customer'} cancelled paid order #${d['orderRef']} — refund of ${d['refundAmount'] != null ? peso(d['refundAmount']) : 'the order total'} awaiting approval${d['reason'] ? ` ("${d['reason']}")` : ''}`
        : `${d['customerName'] || 'A customer'} requested a return on order #${d['orderRef']} — ${d['itemCount']} ${plural(d['itemCount'], 'item')}${d['reason'] ? ` ("${d['reason']}")` : ''}`,
  },
  'return.approve': {
    category: 'update',
    entity: 'Return',
    describe: (d) =>
      d['kind'] === 'cancellation'
        ? `Approved refund ${d['returnRef']} for ${d['customerName'] || 'a customer'} on cancelled order #${d['orderRef']} — awaiting payout`
        : `Approved ${d['returnRef']} for ${d['customerName'] || 'a customer'} on order #${d['orderRef']} — awaiting the items`,
  },
  'return.reject': {
    category: 'update',
    entity: 'Return',
    describe: (d) =>
      d['kind'] === 'cancellation'
        ? `Declined refund ${d['returnRef']} for ${d['customerName'] || 'a customer'}${d['note'] ? ` — "${d['note']}"` : ''}`
        : `Rejected ${d['returnRef']} for ${d['customerName'] || 'a customer'}${d['note'] ? ` — "${d['note']}"` : ''}`,
  },
  'return.received': {
    category: 'update',
    entity: 'Return',
    describe: (d) =>
      `Received ${d['itemCount']} ${plural(d['itemCount'], 'unit')} back for ${d['returnRef']} and added them to stock${d['paymentStatusTo'] === 'refunded' ? ' — order marked refunded' : ''}`,
  },
  'return.refund_mark': {
    category: 'update',
    entity: 'Return',
    describe: (d) =>
      `Marked ${d['returnRef']} as ${d['to'] === 'refunded' ? 'refunded' : String(d['to']).replace('_', ' ')} (was ${String(d['from'] || '').replace('_', ' ')})${d['paymentStatusTo'] === 'refunded' ? ' — order marked refunded' : ''}`,
  },
  'support.create': {
    category: 'create',
    entity: 'Support',
    describe: (d) =>
      `${d['customerName'] || 'A customer'} sent a ${d['type'] || 'support'} message${d['ticketNumber'] ? ` (${ticket(d)})` : ''}: "${d['subject']}"`,
  },
  'support.reply': {
    category: 'update',
    entity: 'Support',
    describe: (d) => `Replied to ${ticket(d) || `"${d['subject']}"`}${d['preview'] ? `: "${d['preview']}"` : ''}`,
  },
  'support.request_resolve': { category: 'update', entity: 'Support', describe: (d) => `Requested resolution approval for ${ticket(d) || `"${d['subject']}"`}` },
  'support.resolve': { category: 'update', entity: 'Support', describe: (d) => `Marked resolved: ${ticket(d)} "${d['subject']}"` },
  'support.reopen': { category: 'update', entity: 'Support', describe: (d) => `Reopened: ${ticket(d)} "${d['subject']}"` },
  'product.create': { category: 'create', entity: 'Product', describe: (d) => `Created product "${d['name']}"` },
  'product.update': { category: 'update', entity: 'Product', describe: (d) => `Updated product "${d['name']}"` },
  'product.restock': {
    category: 'update',
    entity: 'Product',
    describe: (d) => `Added ${d['quantity']} units to "${d['name']}" (${d['from']} → ${d['to']}) — verified by ${d['clerkName']} (${d['clerkCode']})`,
  },
  'product.archive': { category: 'archive', entity: 'Product', describe: (d) => `Archived product "${d['name']}"` },
  'product.restore': { category: 'archive', entity: 'Product', describe: (d) => `Restored product "${d['name']}"` },
  'product.delete': { category: 'delete', entity: 'Product', describe: (d) => `Deleted product "${d['name']}"` },
  'category.create': { category: 'create', entity: 'Category', describe: (d) => `Created category "${d['name']}"` },
  'category.update': { category: 'update', entity: 'Category', describe: (d) => `Updated category "${d['name']}"` },
  'category.delete': { category: 'delete', entity: 'Category', describe: (d) => `Deleted category "${d['name']}"` },
  'service.create': { category: 'create', entity: 'Service', describe: (d) => `Created service "${d['name']}"` },
  'service.update': { category: 'update', entity: 'Service', describe: (d) => `Updated service "${d['name']}"` },
  'service.archive': { category: 'archive', entity: 'Service', describe: (d) => `Archived service "${d['name']}"` },
  'service.restore': { category: 'archive', entity: 'Service', describe: (d) => `Restored service "${d['name']}"` },
  'service.delete': { category: 'delete', entity: 'Service', describe: (d) => `Deleted service "${d['name']}"` },
  'voucher.create': { category: 'create', entity: 'Voucher', describe: (d) => `Created voucher ${d['code']}` },
  'voucher.activate': { category: 'update', entity: 'Voucher', describe: (d) => `Activated voucher ${d['code']}` },
  'voucher.deactivate': { category: 'update', entity: 'Voucher', describe: (d) => `Deactivated voucher ${d['code']}` },
  'voucher.delete': { category: 'delete', entity: 'Voucher', describe: (d) => `Deleted voucher ${d['code']}` },
  'announcement.create': { category: 'create', entity: 'Announcement', describe: (d) => `Created announcement "${d['title']}"` },
  'announcement.delete': { category: 'delete', entity: 'Announcement', describe: (d) => `Deleted announcement "${d['title']}"` },
  'supplier.create': { category: 'create', entity: 'Supplier', describe: (d) => `Added supplier "${d['name']}"` },
  'supplier.update': { category: 'update', entity: 'Supplier', describe: (d) => `Updated supplier "${d['name']}"` },
  'supplier.activate': { category: 'update', entity: 'Supplier', describe: (d) => `Activated supplier "${d['name']}"` },
  'supplier.deactivate': { category: 'update', entity: 'Supplier', describe: (d) => `Deactivated supplier "${d['name']}"` },
  'supplier.delete': { category: 'delete', entity: 'Supplier', describe: (d) => `Deleted supplier "${d['name']}"` },
};

export function describeAudit(action: string, details: Details | null, nameOf?: NameOf): string {
  const meta = ACTION_META[action];
  return meta && details ? meta.describe(details, nameOf) : action;
}

// Postgres hands TIMESTAMPTZ columns back as ISO strings carrying a "Z"; older SQLite-era rows
// were naive "YYYY-MM-DD HH:MM:SS" in UTC. Only add the "Z" when no timezone is present.
export function parseUtc(value: string): Date {
  const isTagged = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(isTagged ? value : `${value.replace(' ', 'T')}Z`);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return parseUtc(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - parseUtc(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDateTime(value);
}

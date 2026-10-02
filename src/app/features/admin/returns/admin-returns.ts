import { Component, computed, inject, signal, viewChild } from '@angular/core';
import {
  LucideBanknote,
  LucideCheck,
  LucideCircleX,
  LucideImage,
  LucidePackageCheck,
  LucideRotateCcw,
  LucideX,
} from '@lucide/angular';

import { AdminReturn, AdminReturnsResponse } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { timeAgo } from '../../../core/audit-actions';
import { formatPrice } from '../../../core/format.util';
import { GalleryItem } from '../../../core/gallery.model';
import { paymentMethodLabel } from '../../../core/payment-methods';
import {
  caseRef,
  isCancellation,
  KIND_LABEL,
  KIND_STYLE,
  orderRef,
  refundStatusLabel,
  RETURN_STATUS_STYLE,
  ReturnKind,
  ReturnStatus,
  statusLabel,
} from '../../../core/returns.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { GalleryLightbox } from '../../../shared/gallery-lightbox/gallery-lightbox';
import { RejectReturnDialog } from '../../../shared/reject-return-dialog/reject-return-dialog';
import { SafeImage } from '../../../shared/safe-image/safe-image';

type KindFilter = 'all' | ReturnKind;
type TabKey = Exclude<ReturnStatus, 'cancelled'>;

// Returns and cancellations share this queue but not its middle: a return is approved, shipped
// back, received (which is what credits stock), then paid out; a cancellation skips straight from
// approved to paid, because nothing was ever shipped and the stock went back at cancel time.
// Hence the kind filter — 'Received' is meaningless for one of them.
const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'return', label: 'Returns' },
  { key: 'cancellation', label: 'Cancellations' },
];

const TABS: { key: TabKey; label: string; kinds?: ReturnKind[] }[] = [
  { key: 'pending', label: 'To Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'received', label: 'Received', kinds: ['return'] },
  { key: 'rejected', label: 'Rejected' },
];

// Where the money physically goes back to. COD never reaches this queue as a cancellation — no
// cash was collected before delivery — so every cancellation here has an online channel to pay.
const REFUND_CHANNEL: Record<string, string> = {
  card: 'back onto the card it was charged to',
  gcash: 'back to the customer’s GCash account',
  qrph: 'back via QR Ph to the account that paid',
  bank: 'back by bank transfer to the customer’s account',
};

/**
 * Mobile analog of frontend/src/pages/admin/Returns.jsx. Same queue, tabs and
 * confirm steps; customer photos are excluded from the list query (base64), so
 * each card pulls its own on demand, and open in the shared lightbox instead
 * of a new browser tab.
 */
@Component({
  selector: 'app-admin-returns',
  imports: [
    ConfirmDialog,
    RejectReturnDialog,
    SafeImage,
    GalleryLightbox,
    LucideRotateCcw,
    LucideCheck,
    LucideX,
    LucidePackageCheck,
    LucideImage,
    LucideBanknote,
    LucideCircleX,
  ],
  templateUrl: './admin-returns.html',
  styleUrl: './admin-returns.css',
})
export class AdminReturns {
  private api = inject(ApiService);
  private rejectDialog = viewChild(RejectReturnDialog);

  protected readonly formatPrice = formatPrice;
  protected readonly timeAgo = timeAgo;
  protected readonly caseRef = caseRef;
  protected readonly orderRef = orderRef;
  protected readonly isCancellation = isCancellation;
  protected readonly statusLabel = statusLabel;
  protected readonly refundStatusLabel = refundStatusLabel;
  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly kindLabel = KIND_LABEL;
  protected readonly kindStyle = KIND_STYLE;
  protected readonly statusStyle = RETURN_STATUS_STYLE;
  protected readonly kindFilters = KIND_FILTERS;

  protected readonly data = signal<AdminReturnsResponse>({ returns: [], counts: [], kindCounts: [] });
  protected readonly loaded = signal(false);
  protected readonly kind = signal<KindFilter>('all');
  protected readonly tab = signal<TabKey>('pending');
  protected readonly error = signal('');

  protected readonly approving = signal<AdminReturn | null>(null);
  protected readonly receiving = signal<AdminReturn | null>(null);
  protected readonly rejecting = signal<AdminReturn | null>(null);
  protected readonly payingOut = signal<AdminReturn | null>(null);

  // Photos per return id: undefined = not requested, null = loading.
  protected readonly photos = signal<Record<string, GalleryItem[] | null>>({});
  protected readonly lightbox = signal<{ items: GalleryItem[]; index: number } | null>(null);

  // Received only exists for returns, so filtering to cancellations while sitting on it would
  // show a permanently empty list with no way to tell why.
  protected readonly visibleTabs = computed(() => {
    const k = this.kind();
    return TABS.filter((t) => !t.kinds || k === 'all' || t.kinds.includes(k));
  });

  constructor() {
    this.load();
  }

  private load(): void {
    const status = this.tab();
    const kind = this.kind();
    this.api
      .get<AdminReturnsResponse>(`/admin/returns?status=${status}&kind=${kind}`)
      .then((d) => {
        // A slower response for a tab the user has already left must not overwrite the new one.
        if (status !== this.tab() || kind !== this.kind()) return;
        this.data.set({ returns: d.returns, counts: d.counts, kindCounts: d.kindCounts || [] });
        this.loaded.set(true);
      })
      .catch(() => {});
  }

  countOf(key: TabKey): number {
    return Number(this.data().counts.find((c) => c.status === key)?.count ?? 0);
  }

  kindCountOf(key: KindFilter): number {
    const kc = this.data().kindCounts;
    return key === 'all' ? kc.reduce((n, c) => n + Number(c.count), 0) : Number(kc.find((c) => c.kind === key)?.count ?? 0);
  }

  selectKind(next: KindFilter): void {
    this.kind.set(next);
    if (!this.visibleTabs().some((t) => t.key === this.tab())) this.tab.set('pending');
    this.load();
  }

  selectTab(next: TabKey): void {
    this.tab.set(next);
    this.load();
  }

  refundChannel(r: AdminReturn): string {
    return REFUND_CHANNEL[r.payment_method] || 'to the original payment method';
  }

  unitCount(r: AdminReturn): number {
    return r.items.reduce((n, i) => n + i.quantity, 0);
  }

  // A return is only payable once the goods are physically back; a cancellation is payable the
  // moment it's approved, because there are no goods to wait for.
  canPayOut(r: AdminReturn): boolean {
    return r.refund_status === 'unpaid' && (isCancellation(r) ? r.status === 'approved' : r.status === 'received');
  }

  showPhotos(r: AdminReturn): void {
    if (this.photos()[r.id] !== undefined) return;
    this.photos.update((p) => ({ ...p, [r.id]: null }));
    this.api
      .get<{ id: string; image: string }[]>(`/admin/returns/${r.id}/photos`)
      .then((rows) =>
        this.photos.update((p) => ({
          ...p,
          [r.id]: rows.map((row) => ({ id: row.id, image: row.image, title: `${caseRef(r.id, r.kind)} · customer photo` })),
        })),
      )
      .catch(() => this.photos.update((p) => ({ ...p, [r.id]: [] })));
  }

  openLightbox(items: GalleryItem[], index: number): void {
    this.lightbox.set({ items, index });
  }

  navigateLightbox(index: number): void {
    this.lightbox.update((lb) => (lb ? { ...lb, index } : lb));
  }

  private async act(fn: () => Promise<unknown>): Promise<void> {
    this.error.set('');
    try {
      await fn();
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }

  approveReturn(): void {
    const r = this.approving();
    this.approving.set(null);
    if (r) this.act(() => this.api.put(`/admin/returns/${r.id}/approve`, {}));
  }

  receiveReturn(): void {
    const r = this.receiving();
    this.receiving.set(null);
    if (r) this.act(() => this.api.put(`/admin/returns/${r.id}/receive`, {}));
  }

  markRefunded(): void {
    const r = this.payingOut();
    this.payingOut.set(null);
    if (r) this.act(() => this.api.put(`/admin/returns/${r.id}/refund-status`, { refundStatus: 'refunded' }));
  }

  async rejectReturn(note: string): Promise<void> {
    const r = this.rejecting();
    if (!r) return;
    try {
      await this.api.put(`/admin/returns/${r.id}/reject`, { note });
      this.rejecting.set(null);
      this.load();
    } catch (err) {
      this.rejectDialog()?.showError((err as Error).message);
    }
  }

  approveTitle(): string {
    return isCancellation(this.approving()) ? 'Approve this refund?' : 'Approve this return?';
  }

  approveMessage(): string {
    const r = this.approving();
    if (!r) return '';
    return isCancellation(r)
      ? `This authorises ${formatPrice(r.refund_amount)} going back to ${r.first_name} ${this.refundChannel(r)}. Record it as sent once you've actually moved the money.`
      : `${r.first_name} will be told to send the items back. Stock is not added until you mark them received.`;
  }

  receiveMessage(): string {
    const r = this.receiving();
    return r ? `This adds ${this.unitCount(r)} unit(s) back into stock straight away. Only do this once the items are physically here.` : '';
  }

  // Recording a payout closes a cancelled order's books — and, for a cancellation, emails the
  // customer that the money has gone — so it gets the same confirm step as every other
  // irreversible action here.
  payOutTitle(): string {
    return isCancellation(this.payingOut()) ? 'Record this refund as sent?' : 'Record this refund as paid?';
  }

  payOutMessage(): string {
    const r = this.payingOut();
    if (!r) return '';
    const channel = REFUND_CHANNEL[r.payment_method] || 'back to the customer';
    const extra = isCancellation(r) ? ` ${r.first_name} will be emailed to say the refund is on its way, and the order stops counting as revenue.` : '';
    return `Only do this once ${formatPrice(r.refund_amount)} has actually gone ${channel}.${extra}`;
  }
}

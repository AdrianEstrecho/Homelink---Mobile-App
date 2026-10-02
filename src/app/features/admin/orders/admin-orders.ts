import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideChevronDown, LucideReceipt, LucideRefreshCw, LucideSearch, LucideTriangleAlert } from '@lucide/angular';

import { AdminOrder } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { formatPrice, statusColor } from '../../../core/format.util';
import { Order } from '../../../core/order.model';
import { paymentMethodLabel } from '../../../core/payment-methods';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { OrderDetailsModal } from '../../../shared/order-details-modal/order-details-modal';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { Select, SelectOption } from '../../../shared/select/select';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const STATUS_OPTIONS: SelectOption[] = STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));
const PAGE_SIZE = 10;

/**
 * Mobile analog of frontend/src/pages/admin/Orders.jsx. The desktop table
 * becomes a tap-to-expand accordion card list for quick status changes;
 * "Full details & receipt" opens the same shared OrderDetailsModal the web
 * opens on row click. Product photos are base64 and left out of the list
 * query, so an order's are fetched the first time it's expanded.
 */
@Component({
  selector: 'app-admin-orders',
  imports: [
    DatePipe,
    FormsModule,
    ConfirmDialog,
    Select,
    SafeImage,
    OrderDetailsModal,
    LucideSearch,
    LucideChevronDown,
    LucideRefreshCw,
    LucideReceipt,
    LucideTriangleAlert,
  ],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css',
})
export class AdminOrders {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;
  protected readonly statusColor = statusColor;
  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly statuses = STATUSES;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly orders = signal<AdminOrder[]>([]);
  protected readonly loaded = signal(false);
  protected readonly tab = signal<'all' | (typeof STATUSES)[number]>('all');
  protected readonly search = signal('');
  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly expandedId = signal<string | null>(null);
  protected readonly detailsId = signal<string | null>(null);
  protected readonly confirmStatus = signal<{ id: string; status: string } | null>(null);
  protected readonly pageError = signal('');
  // Item photos per order id, keyed by order_item id — absent until that order is first opened.
  protected readonly itemImages = signal<Record<string, Record<string, string>>>({});

  protected readonly counts = computed(() => {
    const list = this.orders();
    const c: Record<string, number> = { all: list.length };
    for (const s of STATUSES) c[s] = list.filter((o) => o.status === s).length;
    return c;
  });

  protected readonly filtered = computed(() => {
    const t = this.tab();
    const q = this.search().trim().toLowerCase();
    return this.orders()
      .filter((o) => t === 'all' || o.status === t)
      .filter((o) => !q || `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  });

  protected readonly visible = computed(() => this.filtered().slice(0, this.visibleCount()));

  // The shared modal speaks the customer-facing Order shape; the admin row carries everything
  // it needs except item photos and slugs, which are filled in here.
  protected readonly detailsOrder = computed<Order | null>(() => {
    const o = this.orders().find((x) => x.id === this.detailsId());
    if (!o) return null;
    const images = this.itemImages()[o.id] ?? {};
    return {
      ...o,
      shipping_address: o.shipping_address ?? '',
      payment_method: o.payment_method ?? '',
      items: o.items.map((i) => ({ ...i, image: images[i.id] ?? '', slug: '' })),
    };
  });

  protected readonly detailsPerson = computed(() => {
    const o = this.orders().find((x) => x.id === this.detailsId());
    return o ? { name: `${o.first_name} ${o.last_name}`, email: o.email } : null;
  });

  private load(): void {
    this.api
      .get<AdminOrder[]>('/admin/orders')
      .then((o) => {
        this.orders.set(o);
        this.loaded.set(true);
      })
      .catch(() => {});
  }

  constructor() {
    // The dashboard's "Needs attention" and pipeline rows link here pre-filtered (?status=pending).
    const status = inject(ActivatedRoute).snapshot.queryParamMap.get('status');
    const match = STATUSES.find((s) => s === status);
    if (match) this.tab.set(match);
    this.load();
  }

  setTab(t: 'all' | (typeof STATUSES)[number]): void {
    this.tab.set(t);
    this.visibleCount.set(PAGE_SIZE);
  }

  setSearch(v: string): void {
    this.search.set(v);
    this.visibleCount.set(PAGE_SIZE);
  }

  loadMore(): void {
    this.visibleCount.update((v) => v + PAGE_SIZE);
  }

  private loadItemImages(id: string): void {
    if (this.itemImages()[id]) return;
    this.api
      .get<{ id: string; image: string }[]>(`/admin/orders/${id}/item-images`)
      .then((rows) => this.itemImages.update((m) => ({ ...m, [id]: Object.fromEntries(rows.map((r) => [r.id, r.image])) })))
      .catch(() => {});
  }

  toggleExpand(id: string): void {
    const opening = this.expandedId() !== id;
    this.expandedId.set(opening ? id : null);
    if (opening) this.loadItemImages(id);
  }

  openDetails(id: string): void {
    this.loadItemImages(id);
    this.detailsId.set(id);
  }

  imageOf(orderId: string, itemId: string): string {
    return this.itemImages()[orderId]?.[itemId] ?? '';
  }

  requestStatusChange(id: string, status: string): void {
    this.confirmStatus.set({ id, status });
  }

  // Cancelling returns the order's units to stock and reinstating one takes them back out, so
  // the server can refuse the change (409) when those units have since been sold — show why.
  async confirmStatusChange(): Promise<void> {
    const target = this.confirmStatus();
    this.confirmStatus.set(null);
    if (!target) return;
    this.pageError.set('');
    try {
      await this.api.put(`/admin/orders/${target.id}/status`, { status: target.status });
    } catch (err) {
      this.pageError.set((err as Error).message);
      return;
    }
    this.load();
  }

  statusLabel(status: string): string {
    return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  }
}

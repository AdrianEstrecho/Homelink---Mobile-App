import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideBadgeCheck,
  LucideBanknote,
  LucideChevronRight,
  LucideCircleCheckBig,
  LucideCircleX,
  LucideClock,
  LucideCreditCard,
  LucideLandmark,
  LucidePackage,
  LucidePackageCheck,
  LucideQrCode,
  LucideRotateCcw,
  LucideSearch,
  LucideShoppingBag,
  LucideSlidersHorizontal,
  LucideSmartphone,
  LucideStar,
  LucideTruck,
  LucideX,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Review, ReviewableProduct } from '../../core/account.model';
import { formatPrice } from '../../core/format.util';
import { Order } from '../../core/order.model';
import { paymentMethodLabel } from '../../core/payment-methods';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { FilterDrawer, FilterOption } from '../../shared/filter-drawer/filter-drawer';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';
import { OrderReviewModal } from '../../shared/order-review-modal/order-review-modal';
import { CreatedReturn, ReturnRequestModal } from '../../shared/return-request-modal/return-request-modal';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { StarRating } from '../../shared/star-rating/star-rating';
import { StatusTabs } from '../../shared/status-tabs/status-tabs';
import { TrackingModal } from '../../shared/tracking-modal/tracking-modal';

/** A card lists its first couple of products in full and folds the rest into "+N more", so a
 *  ten-item order can't push the total off the screen. */
const ITEMS_SHOWN = 2;

type DisplayStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'returned' | 'cancelled';

/** Badge, icon tile and wording per status. Whole class strings, because Tailwind only sees class
 *  names written out in source. */
const STATUS_META: Record<DisplayStatus, { label: string; pill: string; tile: string }> = {
  pending: { label: 'Pending', pill: 'bg-amber-100 text-amber-800', tile: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', pill: 'bg-blue-100 text-blue-800', tile: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'On the way', pill: 'bg-purple-100 text-purple-800', tile: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', pill: 'bg-green-100 text-green-800', tile: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', pill: 'bg-emerald-600 text-white', tile: 'bg-emerald-600 text-white' },
  returned: { label: 'Returned', pill: 'bg-orange-100 text-orange-800', tile: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelled', pill: 'bg-red-100 text-red-700', tile: 'bg-red-100 text-red-600' },
};

/** The journey a card's progress strip draws: the four ORDER_STEPS the backend tracks, then the
 *  customer's own sign-off as the last step. */
const PROGRESS_STEPS = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Completed'];
const PROGRESS_INDEX: Partial<Record<DisplayStatus, number>> = { pending: 0, processing: 1, shipped: 2, delivered: 3, completed: 4 };

interface OrderTab {
  key: string;
  label: string;
  match: (o: Order) => boolean;
  empty: string;
}

// Every tab but All is exclusive: a returned order is filed under Returns only, and a completed
// one under Completed only rather than also sitting in To Review. Cancelled wins over returned:
// the backend also flags a cancelled order `returned` once its refund has been paid out.
const TABS: OrderTab[] = [
  { key: 'all', label: 'All', match: () => true, empty: 'No orders yet.' },
  { key: 'to-ship', label: 'To Ship', match: (o) => o.status === 'pending' || o.status === 'processing', empty: 'Nothing waiting to be shipped.' },
  { key: 'to-receive', label: 'To Receive', match: (o) => o.status === 'shipped', empty: 'Nothing on its way right now.' },
  { key: 'to-review', label: 'To Review', match: (o) => o.status === 'delivered' && !o.returned && !o.completed_at, empty: 'No delivered orders waiting on you.' },
  { key: 'returns', label: 'Returns', match: (o) => !!o.returned && o.status !== 'cancelled', empty: 'No returns yet. Cancellation refunds are tracked under Returns & Cancellations in your account.' },
  { key: 'completed', label: 'Completed', match: (o) => o.status === 'delivered' && !!o.completed_at && !o.returned, empty: 'No completed orders yet. Mark a delivered order as completed once you’re happy with it.' },
  { key: 'cancelled', label: 'Cancelled', match: (o) => o.status === 'cancelled', empty: 'No cancelled orders.' },
];

/** An item with no category files under this key, so it can still be filtered to. */
const NO_CATEGORY = 'other';

@Component({
  selector: 'app-orders',
  imports: [
    DatePipe,
    PricePipe,
    OrderDetailsModal,
    OrderReviewModal,
    ReturnRequestModal,
    CancelReasonModal,
    ConfirmDialog,
    FilterDrawer,
    TrackingModal,
    SafeImage,
    StarRating,
    StatusTabs,
    LucideBadgeCheck,
    LucideBanknote,
    LucideChevronRight,
    LucideCircleCheckBig,
    LucideCircleX,
    LucideClock,
    LucideCreditCard,
    LucideLandmark,
    LucidePackage,
    LucidePackageCheck,
    LucideQrCode,
    LucideRotateCcw,
    LucideSearch,
    LucideShoppingBag,
    LucideSlidersHorizontal,
    LucideSmartphone,
    LucideStar,
    LucideTruck,
    LucideX,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly itemsShown = ITEMS_SHOWN;
  protected readonly progressSteps = PROGRESS_STEPS;

  protected readonly orders = signal<Order[]>([]);
  protected readonly loaded = signal(false);
  protected readonly selectedOrder = signal<Order | null>(null);
  protected readonly trackingOrder = signal<Order | null>(null);
  protected readonly cancelTarget = signal<Order | null>(null);
  protected readonly returnTarget = signal<Order | null>(null);
  protected readonly reviewTarget = signal<Order | null>(null);
  protected readonly completeTarget = signal<Order | null>(null);
  protected readonly completing = signal(false);

  protected readonly search = signal('');
  protected readonly filtersOpen = signal(false);

  /** Product IDs the signed-in user has purchased but not yet reviewed — lets
   *  the order details modal offer a "Write a Review" per item, without a
   *  separate trip to the Reviews page. */
  protected readonly reviewableProductIds = signal<Set<string>>(new Set());

  /** Reviews already posted, keyed by product ID — the cards show the rating back, and the
   *  modals use it to stop offering a second review of the same product. */
  protected readonly reviewsByProduct = signal<Map<string, Review>>(new Map());

  protected readonly cancelModal = viewChild(CancelReasonModal);

  // Status and category live in the URL so a filtered view survives back navigation; anything
  // unrecognised falls back to everything.
  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly activeTab = computed(() => {
    const requested = this.queryParamMap().get('tab');
    return TABS.find((t) => t.key === requested) ?? TABS[0];
  });
  protected readonly activeCategory = computed(() => this.queryParamMap().get('category') ?? '');

  /** Every product category across the customer's orders, counted by orders that carry it. */
  protected readonly categoryOptions = computed<FilterOption[]>(() => {
    const byKey = new Map<string, FilterOption>();
    for (const o of this.orders()) {
      const seen = new Set<string>();
      for (const i of o.items || []) {
        const key = i.category_slug || NO_CATEGORY;
        if (seen.has(key)) continue;
        seen.add(key);
        const entry = byKey.get(key) ?? { key, label: i.category || 'Other', count: 0 };
        entry.count += 1;
        byKey.set(key, entry);
      }
    }
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  });
  protected readonly activeCategoryLabel = computed(
    () => this.categoryOptions().find((c) => c.key === this.activeCategory())?.label ?? '',
  );

  /** Search and category narrow the list first; the status counts are taken over what's left, so
   *  the tabs always say how many of each the current search would show. */
  private readonly searched = computed(() => {
    const terms = this.search().trim().toLowerCase().split(/\s+/).filter(Boolean);
    const category = this.activeCategory();
    return this.orders().filter((o) => {
      if (category && !(o.items || []).some((i) => (i.category_slug || NO_CATEGORY) === category)) return false;
      if (!terms.length) return true;
      const haystack = this.searchText(o);
      return terms.every((t) => haystack.includes(t));
    });
  });
  protected readonly statusOptions = computed<FilterOption[]>(() => {
    const list = this.searched();
    return TABS.map((t) => ({ key: t.key, label: t.label, count: list.filter(t.match).length }));
  });
  protected readonly visible = computed(() => this.searched().filter(this.activeTab().match));
  // The tabs are how you move around the list, not a filter to clear — only category counts here.
  protected readonly activeFilterCount = computed(() => (this.activeCategory() ? 1 : 0));
  protected readonly isFiltering = computed(() => this.activeFilterCount() > 0 || !!this.search().trim());

  /** What the cancel dialog says depends on whether money has to travel back — payment_status,
   *  not payment_method: an unverified bank transfer has taken nothing and cancels like COD. */
  protected readonly cancelMessage = computed(() => {
    const o = this.cancelTarget();
    if (o?.payment_status === 'paid') {
      return `This can't be undone. You've already paid ${formatPrice(o.total)} by ${paymentMethodLabel(o.payment_method)} — we'll review the refund and send it back to you. Let us know why you're cancelling.`;
    }
    return "This can't be undone once submitted. Nothing has been charged, so there's no refund to process. Let us know why you're cancelling.";
  });

  protected readonly billedTo = () => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  };

  constructor() {
    this.loadOrders();
    this.api
      .get<ReviewableProduct[]>('/reviews/reviewable')
      .then((data) => this.reviewableProductIds.set(new Set(data.map((p) => p.id))))
      .catch(() => {});
    this.api
      .get<Review[]>('/reviews/my')
      .then((data) => this.reviewsByProduct.set(new Map(data.map((r) => [r.product_id, r]))))
      .catch(() => {});
  }

  private loadOrders(): void {
    this.api
      .get<Order[]>('/orders/my')
      .then((data) => this.orders.set(data))
      .catch(() => {})
      .finally(() => this.loaded.set(true));
  }

  private searchText(o: Order): string {
    const ref = o.id.slice(0, 8);
    return [
      ref,
      `#${ref}`,
      paymentMethodLabel(o.payment_method),
      this.meta(o).label,
      ...(o.items || []).flatMap((i) => [i.name, i.brand ?? '', i.category ?? '']),
    ]
      .join(' ')
      .toLowerCase();
  }

  private setQuery(params: Record<string, string | null>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  selectTab(key: string): void {
    this.setQuery({ tab: key === TABS[0].key ? null : key });
  }

  selectCategory(key: string): void {
    this.setQuery({ category: key || null });
  }

  /** Clears the search and category; the status tab stays where the customer put it. */
  clearAll(): void {
    this.search.set('');
    this.selectCategory('');
  }

  emptyMessage(): string {
    if (this.search().trim() || this.activeCategory()) return 'No orders match your search and filters.';
    return this.activeTab().empty;
  }

  /** Cancelled first (a paid-out cancellation refund also sets `returned`); then a live return;
   *  then the customer's own sign-off; then the order row. Same rules as the web Orders page. */
  displayStatus(o: Order): DisplayStatus {
    if (o.status === 'cancelled') return 'cancelled';
    if (o.returned) return 'returned';
    if (o.status === 'delivered' && o.completed_at) return 'completed';
    return (o.status as DisplayStatus) in STATUS_META ? (o.status as DisplayStatus) : 'pending';
  }

  meta(o: Order) {
    return STATUS_META[this.displayStatus(o)];
  }

  /** -1 for orders that left the normal journey (cancelled, returned): they get a notice instead. */
  progressIndex(o: Order): number {
    return PROGRESS_INDEX[this.displayStatus(o)] ?? -1;
  }

  /** Units, not line count — "3 items" should mean three things in the box. */
  unitCount(o: Order): number {
    return (o.items || []).reduce((n, i) => n + (i.quantity || 0), 0);
  }

  canReview(o: Order): boolean {
    if (o.status !== 'delivered' || o.returned) return false;
    const reviewed = this.reviewsByProduct();
    return (o.items || []).some((i) => !reviewed.has(i.product_id));
  }

  /** Delivered, not sent back, and not signed off yet. */
  canComplete(o: Order): boolean {
    return o.status === 'delivered' && !o.returned && !o.completed_at;
  }

  /** A review belongs to the product, not to one order of it, so it shows on any delivered
   *  order carrying that product. */
  ratingFor(o: Order, productId: string): Review | undefined {
    return o.status === 'delivered' ? this.reviewsByProduct().get(productId) : undefined;
  }

  openReview(event: Event, o: Order): void {
    // The card underneath opens the order details; rating is its own errand.
    event.stopPropagation();
    this.reviewTarget.set(o);
  }

  openComplete(event: Event, o: Order): void {
    event.stopPropagation();
    this.completeTarget.set(o);
  }

  /** canReturn comes from the server (delivered, inside the return window, units left to
   *  return, no live request), so the card offers exactly what the details modal would. */
  canRefund(o: Order): boolean {
    return !!o.canReturn && !o.completed_at;
  }

  openRefund(event: Event, o: Order): void {
    event.stopPropagation();
    this.returnTarget.set(o);
  }

  async confirmComplete(): Promise<void> {
    const order = this.completeTarget();
    if (!order || this.completing()) return;
    this.completing.set(true);
    try {
      const res = await this.api.put<{ completed_at?: string; order?: { completed_at?: string } }>(`/orders/${order.id}/complete`, {});
      const completedAt = res?.completed_at ?? res?.order?.completed_at ?? new Date().toISOString();
      const patch = (o: Order): Order => (o.id === order.id ? { ...o, completed_at: completedAt, canReturn: false } : o);
      this.orders.update((prev) => prev.map(patch));
      this.selectedOrder.update((prev) => (prev ? patch(prev) : prev));
      this.toast.showToast({
        icon: 'check',
        iconClass: 'bg-emerald-100 text-emerald-700',
        title: 'Order completed',
        description: `Order #${order.id.slice(0, 8).toUpperCase()} · thanks for confirming`,
      });
    } catch (err) {
      this.toast.showToast({
        icon: 'x-circle',
        iconClass: 'bg-red-100 text-red-600',
        title: 'Couldn’t complete the order',
        description: (err as Error).message,
      });
    } finally {
      this.completing.set(false);
      this.completeTarget.set(null);
    }
  }

  private recordReviews(reviews: Review[]): void {
    this.reviewableProductIds.update((prev) => {
      const next = new Set(prev);
      for (const r of reviews) next.delete(r.product_id);
      return next;
    });
    this.reviewsByProduct.update((prev) => {
      const next = new Map(prev);
      for (const r of reviews) next.set(r.product_id, r);
      return next;
    });
  }

  handleReviewed(review: Review): void {
    this.recordReviews([review]);
  }

  handleReviewsPosted(reviews: Review[]): void {
    this.reviewTarget.set(null);
    this.recordReviews(reviews);
    this.toast.showToast({
      icon: 'star',
      iconClass: 'bg-brand-orange/10 text-brand-orange',
      title: reviews.length === 1 ? 'Review posted' : `${reviews.length} reviews posted`,
      description: 'Thanks for helping other shoppers.',
    });
  }

  handleReturnSubmitted(created: CreatedReturn): void {
    this.returnTarget.set(null);
    this.selectedOrder.set(null);
    this.loadOrders();
    this.toast.showToast({
      icon: 'package-check',
      iconClass: 'bg-green-100 text-green-600',
      title: 'Return request submitted',
      description: `${created.ref} · we’ll email you once it’s reviewed`,
    });
  }

  // An order already paid for online comes back with a refund reference: the cancel went through
  // either way, but the money now has to be approved and sent, so "cancelled" alone would leave
  // the customer wondering where their payment went.
  async submitCancel(reason: string): Promise<void> {
    const order = this.cancelTarget();
    if (!order) return;
    try {
      const { refund } = await this.api.put<{ refund: { ref: string; amount: number } | null }>(`/orders/${order.id}/cancel`, { reason });
      this.orders.update((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled', cancel_reason: reason } : o)));
      this.selectedOrder.update((prev) => (prev && prev.id === order.id ? { ...prev, status: 'cancelled', cancel_reason: reason } : prev));
      this.cancelTarget.set(null);
      this.toast.showToast(
        refund
          ? {
              icon: 'banknote',
              iconClass: 'bg-amber-100 text-amber-700',
              title: 'Cancelled — refund on the way',
              description: `${refund.ref} · we’ll email you once it’s approved`,
              action: { label: 'Track refund', to: '/account/returns' },
            }
          : {
              icon: 'x-circle',
              iconClass: 'bg-red-100 text-red-600',
              title: 'Order cancelled',
              description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
            },
      );
    } catch (err) {
      this.cancelModal()?.showError((err as Error).message);
    }
  }
}

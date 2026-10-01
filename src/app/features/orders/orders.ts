import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideChevronRight, LucideShoppingBag, LucideStar } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Review, ReviewableProduct } from '../../core/account.model';
import { formatPrice, statusColor } from '../../core/format.util';
import { Order } from '../../core/order.model';
import { paymentMethodLabel } from '../../core/payment-methods';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';
import { OrderReviewModal } from '../../shared/order-review-modal/order-review-modal';
import { CreatedReturn, ReturnRequestModal } from '../../shared/return-request-modal/return-request-modal';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { StarRating } from '../../shared/star-rating/star-rating';
import { TrackingModal } from '../../shared/tracking-modal/tracking-modal';

/** A card lists its first few products in full and folds the rest into "+N more", so a
 *  ten-item order can't push the total off the screen. */
const ITEMS_SHOWN = 3;

// A hairline of status colour along the top edge, so a column of cards reads by colour first.
// Whole class strings, because Tailwind only sees class names written out in source.
const STATUS_ACCENTS: Record<string, string> = {
  pending: 'from-yellow-400 to-yellow-400/20',
  processing: 'from-blue-500 to-blue-500/20',
  shipped: 'from-purple-500 to-purple-500/20',
  delivered: 'from-green-500 to-green-500/20',
  cancelled: 'from-red-400 to-red-400/20',
  returned: 'from-orange-400 to-orange-400/20',
};
const DEFAULT_ACCENT = 'from-gray-300 to-gray-300/20';

interface OrderTab {
  key: string;
  label: string;
  match: (o: Order) => boolean;
  empty: string;
}

// Every tab but All is exclusive: a returned order is filed under Returns only and does not also
// sit in To Review waiting to be rated. Mirrors frontend/src/pages/Orders.jsx.
const TABS: OrderTab[] = [
  { key: 'all', label: 'All', match: () => true, empty: 'No orders yet.' },
  { key: 'to-ship', label: 'To Ship', match: (o) => o.status === 'pending' || o.status === 'processing', empty: 'Nothing waiting to be shipped.' },
  { key: 'to-receive', label: 'To Receive', match: (o) => o.status === 'shipped', empty: 'Nothing on its way right now.' },
  { key: 'to-review', label: 'To Review', match: (o) => o.status === 'delivered' && !o.returned, empty: 'No delivered orders to review yet.' },
  { key: 'returns', label: 'Returns', match: (o) => !!o.returned, empty: 'No returns yet. Cancellation refunds are tracked under Returns & Cancellations in your account.' },
  { key: 'cancelled', label: 'Cancelled', match: (o) => o.status === 'cancelled', empty: 'No cancelled orders.' },
];
const DEFAULT_TAB = TABS[0].key;

@Component({
  selector: 'app-orders',
  imports: [
    DatePipe,
    PricePipe,
    OrderDetailsModal,
    OrderReviewModal,
    ReturnRequestModal,
    CancelReasonModal,
    TrackingModal,
    SafeImage,
    StarRating,
    LucideChevronRight,
    LucideShoppingBag,
    LucideStar,
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

  protected readonly statusColor = statusColor;
  protected readonly paymentMethodLabel = paymentMethodLabel;
  protected readonly tabs = TABS;
  protected readonly itemsShown = ITEMS_SHOWN;

  protected readonly orders = signal<Order[]>([]);
  protected readonly loaded = signal(false);
  protected readonly selectedOrder = signal<Order | null>(null);
  protected readonly trackingOrder = signal<Order | null>(null);
  protected readonly cancelTarget = signal<Order | null>(null);
  protected readonly returnTarget = signal<Order | null>(null);
  protected readonly reviewTarget = signal<Order | null>(null);

  /** Product IDs the signed-in user has purchased but not yet reviewed — lets
   *  the order details modal offer a "Write a Review" per item, without a
   *  separate trip to the Reviews page. */
  protected readonly reviewableProductIds = signal<Set<string>>(new Set());

  /** Reviews already posted, keyed by product ID — the cards show the rating back, and the
   *  modals use it to stop offering a second review of the same product. */
  protected readonly reviewsByProduct = signal<Map<string, Review>>(new Map());

  protected readonly cancelModal = viewChild(CancelReasonModal);

  // The tab lives in the URL so a filtered view survives back navigation; anything unrecognised
  // falls back to All.
  private queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly activeTab = computed(() => {
    const requested = this.queryParamMap().get('tab');
    return TABS.find((t) => t.key === requested) ?? TABS[0];
  });
  protected readonly counts = computed(() => {
    const list = this.orders();
    return Object.fromEntries(TABS.map((t) => [t.key, list.filter(t.match).length])) as Record<string, number>;
  });
  protected readonly visible = computed(() => this.orders().filter(this.activeTab().match));

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

  selectTab(key: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: key === DEFAULT_TAB ? null : key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** A live return outranks the order's own status everywhere the customer sees it. */
  displayStatus(o: Order): string {
    return o.returned ? 'returned' : o.status;
  }

  accentFor(o: Order): string {
    return STATUS_ACCENTS[this.displayStatus(o)] ?? DEFAULT_ACCENT;
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

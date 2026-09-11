import { DatePipe } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { LucideChevronRight, LucideShoppingBag } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Review, ReviewableProduct } from '../../core/account.model';
import { statusColor } from '../../core/format.util';
import { Order } from '../../core/order.model';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { TrackingModal } from '../../shared/tracking-modal/tracking-modal';

@Component({
  selector: 'app-orders',
  imports: [DatePipe, PricePipe, OrderDetailsModal, CancelReasonModal, TrackingModal, SafeImage, LucideChevronRight, LucideShoppingBag],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected readonly statusColor = statusColor;
  protected readonly orders = signal<Order[]>([]);
  protected readonly selectedOrder = signal<Order | null>(null);
  protected readonly trackingOrder = signal<Order | null>(null);
  protected readonly cancelTarget = signal<Order | null>(null);

  /** Product IDs the signed-in user has purchased but not yet reviewed — lets
   *  the order details modal offer a "Write a Review" per item, without a
   *  separate trip to the Reviews page. */
  protected readonly reviewableProductIds = signal<Set<string>>(new Set());

  /** Reviews already posted, keyed by product ID — so the modal can show what
   *  was written instead of nothing once a product has been reviewed. */
  protected readonly reviewsByProduct = signal<Map<string, Review>>(new Map());

  protected readonly cancelModal = viewChild(CancelReasonModal);

  protected readonly billedTo = () => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  };

  constructor() {
    this.api
      .get<Order[]>('/orders/my')
      .then((data) => this.orders.set(data))
      .catch(() => {});
    this.api
      .get<ReviewableProduct[]>('/reviews/reviewable')
      .then((data) => this.reviewableProductIds.set(new Set(data.map((p) => p.id))))
      .catch(() => {});
    this.api
      .get<Review[]>('/reviews/my')
      .then((data) => this.reviewsByProduct.set(new Map(data.map((r) => [r.product_id, r]))))
      .catch(() => {});
  }

  handleReviewed(review: Review): void {
    this.reviewableProductIds.update((prev) => {
      const next = new Set(prev);
      next.delete(review.product_id);
      return next;
    });
    this.reviewsByProduct.update((prev) => new Map(prev).set(review.product_id, review));
  }

  async submitCancel(reason: string): Promise<void> {
    const order = this.cancelTarget();
    if (!order) return;
    try {
      await this.api.put(`/orders/${order.id}/cancel`, { reason });
      this.orders.update((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled', cancel_reason: reason } : o)));
      this.selectedOrder.update((prev) => (prev && prev.id === order.id ? { ...prev, status: 'cancelled', cancel_reason: reason } : prev));
      this.cancelTarget.set(null);
      this.toast.showToast({
        icon: 'x-circle',
        iconClass: 'bg-red-100 text-red-600',
        title: 'Order cancelled',
        description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
      });
    } catch (err) {
      this.cancelModal()?.showError((err as Error).message);
    }
  }
}

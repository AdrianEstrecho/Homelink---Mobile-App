import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCircleCheck,
  LucideCreditCard,
  LucideDownload,
  LucideMapPin,
  LucidePenLine,
  LucidePrinter,
  LucideX,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Review } from '../../core/account.model';
import { PricePipe } from '../../core/price.pipe';
import { Order, OrderItem, PendingOrder } from '../../core/order.model';
import { downloadReceiptPdf, ReceiptPerson } from '../../core/receipt-pdf.util';
import { statusColor } from '../../core/format.util';
import { SafeImage } from '../safe-image/safe-image';
import { StarRating } from '../star-rating/star-rating';

const REVIEWABLE_STATUSES = new Set(['delivered', 'completed']);

/**
 * Ported from frontend/src/components/OrderDetailsModal.jsx — three modes:
 * plain view (Orders page), `previewing` (Checkout's review step, backed by
 * a PendingOrder that has no id/status/created_at yet), and `justConfirmed`
 * (the post-payment receipt). Print uses the same .printing-active/.print-area
 * CSS as the React version (ported into global styles.css in Phase 0).
 *
 * Mobile-only addition: writing a product review lives here now instead of a
 * separate Reviews step — `reviewableProductIds` (from GET /reviews/reviewable,
 * fetched by the caller) says which of this order's items the user hasn't
 * reviewed yet, so the "Write a Review" prompt only shows on delivered orders
 * for products still eligible. `reviewsByProduct` (from GET /reviews/my) shows
 * what was already posted instead of nothing once a product's been reviewed.
 */
@Component({
  selector: 'app-order-details-modal',
  imports: [
    DatePipe,
    FormsModule,
    SafeImage,
    StarRating,
    PricePipe,
    LucideX,
    LucideMapPin,
    LucideCreditCard,
    LucidePrinter,
    LucideDownload,
    LucideCircleCheck,
    LucidePenLine,
  ],
  templateUrl: './order-details-modal.html',
  styleUrl: './order-details-modal.css',
})
export class OrderDetailsModal {
  private api = inject(ApiService);

  readonly order = input.required<Order | PendingOrder>();
  readonly person = input<ReceiptPerson | null>(null);
  readonly personLabel = input('Customer');
  readonly justConfirmed = input(false);
  readonly previewing = input(false);
  readonly confirmLoading = input(false);
  readonly error = input<string>();
  readonly showCancel = input(false);
  readonly reviewableProductIds = input<Set<string>>(new Set());
  readonly reviewsByProduct = input<Map<string, Review>>(new Map());

  readonly closed = output<void>();
  readonly confirmed = output<void>();
  readonly cancelRequested = output<void>();
  /** Emits the posted review once it's saved. */
  readonly reviewed = output<Review>();

  protected readonly statusColor = statusColor;

  protected readonly writingProductId = signal<string | null>(null);
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly reviewSaving = signal(false);
  protected readonly reviewError = signal('');

  constructor() {
    const cleanup = () => document.body.classList.remove('printing-active');
    window.addEventListener('afterprint', cleanup);
    inject(DestroyRef).onDestroy(() => {
      cleanup();
      window.removeEventListener('afterprint', cleanup);
    });
  }

  asOrder(): Order {
    return this.order() as Order;
  }

  isPending(): boolean {
    return this.asOrder().status === 'pending';
  }

  canReviewItem(item: OrderItem): boolean {
    return (
      !this.previewing() &&
      !this.justConfirmed() &&
      REVIEWABLE_STATUSES.has(this.asOrder().status) &&
      this.reviewableProductIds().has(item.product_id)
    );
  }

  existingReview(item: OrderItem): Review | undefined {
    return this.reviewsByProduct().get(item.product_id);
  }

  startReview(item: OrderItem): void {
    this.writingProductId.set(item.product_id);
    this.rating.set(0);
    this.comment.set('');
    this.reviewError.set('');
  }

  cancelReview(): void {
    this.writingProductId.set(null);
    this.reviewError.set('');
  }

  async submitReview(item: OrderItem): Promise<void> {
    if (!this.rating()) {
      this.reviewError.set('Pick a star rating');
      return;
    }
    this.reviewSaving.set(true);
    this.reviewError.set('');
    try {
      const posted = await this.api.post<Review>('/reviews', {
        productId: item.product_id,
        orderId: this.asOrder().id,
        rating: this.rating(),
        comment: this.comment(),
      });
      this.writingProductId.set(null);
      this.reviewed.emit(posted);
    } catch (err) {
      this.reviewError.set((err as Error).message);
    } finally {
      this.reviewSaving.set(false);
    }
  }

  handlePrint(): void {
    document.body.classList.add('printing-active');
    window.print();
  }

  handleDownload(): void {
    downloadReceiptPdf(this.asOrder(), this.person(), this.personLabel());
  }
}

import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLoaderCircle, LucideStar, LucideX } from '@lucide/angular';

import { Review } from '../../core/account.model';
import { ApiService } from '../../core/api.service';
import { Order } from '../../core/order.model';
import { SafeImage } from '../safe-image/safe-image';
import { StarRating } from '../star-rating/star-rating';

interface Draft {
  rating: number;
  comment: string;
}

/**
 * Ported from frontend/src/components/OrderReviewModal.jsx — rate every not-yet-reviewed product
 * of a delivered order in one go, straight from its card on My Orders. Reviews are one per
 * customer per product (the backend 400s a second one), so only products missing from
 * `reviewed` are offered, deduped by product.
 */
@Component({
  selector: 'app-order-review-modal',
  imports: [FormsModule, SafeImage, StarRating, LucideStar, LucideX, LucideLoaderCircle],
  templateUrl: './order-review-modal.html',
  styleUrl: './order-review-modal.css',
})
export class OrderReviewModal {
  private api = inject(ApiService);

  readonly order = input.required<Order>();
  readonly reviewed = input<Map<string, Review>>(new Map());

  readonly closed = output<void>();
  /** Emits every review that was saved, so the caller can update its own state without a refetch. */
  readonly submitted = output<Review[]>();

  protected readonly drafts = signal<Record<string, Draft>>({});
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly orderNumber = computed(() => this.order().id.slice(0, 8).toUpperCase());

  protected readonly items = computed(() => {
    const seen = new Set<string>();
    return (this.order().items || []).filter((i) => {
      if (seen.has(i.product_id) || this.reviewed().has(i.product_id)) return false;
      seen.add(i.product_id);
      return true;
    });
  });

  protected readonly rated = computed(() => this.items().filter((i) => (this.drafts()[i.product_id]?.rating ?? 0) > 0));

  draftOf(productId: string): Draft {
    return this.drafts()[productId] ?? { rating: 0, comment: '' };
  }

  setDraft(productId: string, patch: Partial<Draft>): void {
    this.drafts.update((d) => ({ ...d, [productId]: { ...this.draftOf(productId), ...patch } }));
  }

  close(): void {
    if (this.submitting()) return;
    this.closed.emit();
  }

  async submit(): Promise<void> {
    const rated = this.rated();
    if (!rated.length || this.submitting()) return;
    this.submitting.set(true);
    this.error.set('');
    const posted: Review[] = [];
    try {
      // Sequential rather than Promise.all: a partial failure should leave the reviews that did
      // land saved, and the first error is the one worth showing.
      for (const i of rated) {
        const draft = this.draftOf(i.product_id);
        posted.push(
          await this.api.post<Review>('/reviews', {
            productId: i.product_id,
            orderId: this.order().id,
            rating: draft.rating,
            comment: draft.comment || '',
          }),
        );
      }
      this.submitted.emit(posted);
    } catch (err) {
      this.error.set((err as Error).message);
      this.submitting.set(false);
    }
  }
}

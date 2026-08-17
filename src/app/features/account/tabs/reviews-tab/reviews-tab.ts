import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucidePenLine, LucideStar, LucideTrash2 } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { Review, ReviewableProduct } from '../../../../core/account.model';
import { StarRating } from '../../../../shared/star-rating/star-rating';

@Component({
  selector: 'app-reviews-tab',
  imports: [FormsModule, RouterLink, StarRating, DatePipe, LucideStar, LucideTrash2, LucidePenLine],
  templateUrl: './reviews-tab.html',
  styleUrl: './reviews-tab.css',
})
export class ReviewsTab {
  private api = inject(ApiService);

  protected readonly reviewable = signal<ReviewableProduct[] | null>(null);
  protected readonly myReviews = signal<Review[] | null>(null);
  protected readonly writing = signal<ReviewableProduct | null>(null);
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .get<ReviewableProduct[]>('/reviews/reviewable')
      .then((data) => this.reviewable.set(data))
      .catch(() => this.reviewable.set([]));
    this.api
      .get<Review[]>('/reviews/my')
      .then((data) => this.myReviews.set(data))
      .catch(() => this.myReviews.set([]));
  }

  startReview(product: ReviewableProduct): void {
    this.writing.set(product);
    this.rating.set(0);
    this.comment.set('');
    this.error.set('');
  }

  cancelReview(): void {
    this.writing.set(null);
    this.rating.set(0);
    this.comment.set('');
    this.error.set('');
  }

  async submitReview(): Promise<void> {
    if (!this.rating()) {
      this.error.set('Pick a star rating');
      return;
    }
    const product = this.writing();
    if (!product) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.post('/reviews', { productId: product.id, orderId: product.order_id, rating: this.rating(), comment: this.comment() });
      this.cancelReview();
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this review?')) return;
    await this.api.delete(`/reviews/${id}`);
    this.load();
  }
}

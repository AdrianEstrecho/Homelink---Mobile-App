import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideStar, LucideTrash2 } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { Review } from '../../../../core/account.model';
import { StarRating } from '../../../../shared/star-rating/star-rating';

/**
 * Writing a review moved to the order details modal (see
 * shared/order-details-modal) so customers rate a product right where they
 * see it, instead of hunting for it in a separate list here. This page is
 * now just the read/manage view of reviews already posted.
 */
@Component({
  selector: 'app-reviews-tab',
  imports: [RouterLink, StarRating, DatePipe, LucideStar, LucideTrash2],
  templateUrl: './reviews-tab.html',
  styleUrl: './reviews-tab.css',
})
export class ReviewsTab {
  private api = inject(ApiService);

  protected readonly myReviews = signal<Review[] | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .get<Review[]>('/reviews/my')
      .then((data) => this.myReviews.set(data))
      .catch(() => this.myReviews.set([]));
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this review?')) return;
    await this.api.delete(`/reviews/${id}`);
    this.load();
  }
}

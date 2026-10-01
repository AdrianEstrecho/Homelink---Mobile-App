import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideBadgeCheck, LucideQuote } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Product, Service } from '../../core/product.model';
import { CountUp } from '../../shared/count-up/count-up';
import { ErrorState } from '../../shared/error-state/error-state';
import { Hero } from '../../shared/hero/hero';
import { ProductCard } from '../../shared/product-card/product-card';
import { RevealDirective } from '../../shared/reveal.directive';
import { ServiceCard } from '../../shared/service-card/service-card';
import { ProductCardSkeleton } from '../../shared/skeleton/product-card-skeleton/product-card-skeleton';
import { ReviewCardSkeleton } from '../../shared/skeleton/review-card-skeleton/review-card-skeleton';
import { ServiceCardSkeleton } from '../../shared/skeleton/service-card-skeleton/service-card-skeleton';
import { StarRating } from '../../shared/star-rating/star-rating';

interface LoadState<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

const STATS = [
  { value: '10,000+', label: 'Homeowners Served' },
  { value: '500+', label: 'Products Available' },
  { value: '50+', label: 'Verified Technicians' },
  { value: '4.8/5', label: 'Average Rating' },
];

interface FeaturedReview {
  id: string;
  rating: number;
  comment: string;
  first_name: string;
  last_name: string;
  product_name: string;
}

/** Past this, a review is clamped on its card with a "Read more" toggle, so one long review
 *  doesn't stretch every card in the row to its height. */
const LONG_REVIEW_CHARS = 120;
const REVIEW_AUTOPLAY_MS = 6000;
/** Must match the carousel's gap-3. */
const REVIEW_GAP_PX = 12;

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    Hero,
    ProductCard,
    ServiceCard,
    ErrorState,
    RevealDirective,
    CountUp,
    StarRating,
    ProductCardSkeleton,
    ReviewCardSkeleton,
    ServiceCardSkeleton,
    LucideArrowRight,
    LucideBadgeCheck,
    LucideQuote,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private api = inject(ApiService);

  protected readonly stats = STATS;
  protected readonly longReviewChars = LONG_REVIEW_CHARS;

  protected readonly featured = signal<LoadState<Product>>({ data: [], loading: true, error: false });
  protected readonly services = signal<LoadState<Service>>({ data: [], loading: true, error: false });
  protected readonly reviews = signal<LoadState<FeaturedReview>>({ data: [], loading: true, error: false });

  protected readonly activeReview = signal(0);
  protected readonly expandedReviews = signal<Set<string>>(new Set());
  private readonly reviewTrack = viewChild<ElementRef<HTMLElement>>('reviewTrack');
  private reviewTimer?: ReturnType<typeof setInterval>;

  /** Averaged over the reviews actually on show, so the number matches the cards under it. */
  protected readonly reviewSummary = computed(() => {
    const list = this.reviews().data;
    if (!list.length) return null;
    const average = list.reduce((sum, r) => sum + r.rating, 0) / list.length;
    return { average, count: list.length };
  });

  constructor() {
    this.loadFeatured();
    this.loadServices();
    this.loadReviews();
    inject(DestroyRef).onDestroy(() => this.stopReviewAutoplay());
  }

  loadReviews(): void {
    this.reviews.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<FeaturedReview[]>('/reviews/featured')
      .then((data) => {
        this.reviews.set({ data, loading: false, error: false });
        this.startReviewAutoplay();
      })
      .catch(() => this.reviews.set({ data: [], loading: false, error: true }));
  }

  initials(r: FeaturedReview): string {
    return `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase();
  }

  isExpanded(id: string): boolean {
    return this.expandedReviews().has(id);
  }

  toggleExpanded(id: string): void {
    this.expandedReviews.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** One card's width plus the gap — the distance between two snap points. */
  private reviewStep(el: HTMLElement): number {
    const card = el.firstElementChild as HTMLElement | null;
    return card ? card.offsetWidth + REVIEW_GAP_PX : el.clientWidth;
  }

  onReviewScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const count = this.reviews().data.length;
    if (!count) return;
    // The last card can't snap all the way to the gutter, so the end of the track counts as it.
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    const index = atEnd ? count - 1 : Math.min(count - 1, Math.round(el.scrollLeft / this.reviewStep(el)));
    if (index === this.activeReview()) return;
    this.activeReview.set(index);
    // A review left open while swiping on would keep the whole row as tall as it is.
    if (this.expandedReviews().size) this.expandedReviews.set(new Set());
  }

  goToReview(index: number): void {
    const el = this.reviewTrack()?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: index * this.reviewStep(el), behavior: 'smooth' });
  }

  /** Any touch on the carousel hands control to the reader for good — no more auto-advance
   *  pulling a review away mid-sentence. */
  onReviewInteract(): void {
    this.stopReviewAutoplay();
  }

  private startReviewAutoplay(): void {
    this.stopReviewAutoplay();
    if (this.reviews().data.length <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.reviewTimer = setInterval(() => {
      const count = this.reviews().data.length;
      if (count > 1) this.goToReview((this.activeReview() + 1) % count);
    }, REVIEW_AUTOPLAY_MS);
  }

  private stopReviewAutoplay(): void {
    if (this.reviewTimer) clearInterval(this.reviewTimer);
    this.reviewTimer = undefined;
  }

  loadFeatured(): void {
    this.featured.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<Product[]>('/products?featured=true&limit=4')
      .then((data) => this.featured.set({ data, loading: false, error: false }))
      .catch(() => this.featured.set({ data: [], loading: false, error: true }));
  }

  loadServices(): void {
    this.services.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      // Most-booked first, the same pick as the web home page.
      .get<Service[]>('/services?sort=popular&limit=4')
      .then((data) => this.services.set({ data: data.slice(0, 4), loading: false, error: false }))
      .catch(() => this.services.set({ data: [], loading: false, error: true }));
  }
}

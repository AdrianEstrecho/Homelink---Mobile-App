import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideBadgeCheck, LucideQuote } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
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
const REVIEW_AUTOPLAY_MS = 4000;
/** After a swipe or a dot tap, the reader gets this long before the carousel moves on its own again. */
const REVIEW_RESUME_AFTER_MS = 4000;
/** No scroll event for this long means a swipe or slide has come to rest. */
const REVIEW_SETTLE_MS = 140;
/** Must match the carousel's gap-3. */
const REVIEW_GAP_PX = 12;
/** The list is rendered three times over and kept on the middle copy, so the carousel can keep
 *  sliding forward (or be swiped back) past either end without ever running out of cards. */
const REVIEW_LOOP_COPIES = 3;

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
  private injector = inject(Injector);
  protected auth = inject(AuthService);

  protected readonly stats = STATS;
  protected readonly longReviewChars = LONG_REVIEW_CHARS;

  protected readonly featured = signal<LoadState<Product>>({ data: [], loading: true, error: false });
  protected readonly services = signal<LoadState<Service>>({ data: [], loading: true, error: false });
  protected readonly reviews = signal<LoadState<FeaturedReview>>({ data: [], loading: true, error: false });

  /** Which review the dots point at (0..n-1), whichever copy of it is on screen. */
  protected readonly activeReview = signal(0);
  protected readonly expandedReviews = signal<Set<string>>(new Set());
  private readonly reviewTrack = viewChild<ElementRef<HTMLElement>>('reviewTrack');
  private reviewTimer?: ReturnType<typeof setInterval>;
  private settleTimer?: ReturnType<typeof setTimeout>;
  /** Position in the rendered (tripled) track, as opposed to activeReview's position in the list. */
  private trackIndex = 0;
  private touching = false;
  private resumeAt = 0;
  private readonly reducedMotion =
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /** What the track actually renders: the reviews three times over when there's more than one. */
  protected readonly loopReviews = computed(() => {
    const list = this.reviews().data;
    const copies = list.length > 1 ? REVIEW_LOOP_COPIES : 1;
    return Array.from({ length: copies }, () => list)
      .flat()
      .map((review, key) => ({ review, key }));
  });

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
    inject(DestroyRef).onDestroy(() => {
      this.stopReviewAutoplay();
      clearTimeout(this.settleTimer);
    });
  }

  loadReviews(): void {
    this.reviews.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<FeaturedReview[]>('/reviews/featured')
      .then((data) => {
        this.reviews.set({ data, loading: false, error: false });
        // Start on the middle copy, so there's a full set of cards to either side.
        afterNextRender(() => this.recenterLoop(), { injector: this.injector });
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

  /** An open review holds the carousel still until it's closed again. */
  toggleExpanded(id: string): void {
    this.expandedReviews.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    this.resumeAt = Date.now() + REVIEW_RESUME_AFTER_MS;
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
    // The side padding centres card i exactly when scrollLeft is i steps in.
    this.trackIndex = Math.round(el.scrollLeft / this.reviewStep(el));
    const index = ((this.trackIndex % count) + count) % count;
    if (index !== this.activeReview()) {
      this.activeReview.set(index);
      // A review left open while moving on would keep the whole row as tall as it is.
      if (this.expandedReviews().size) this.expandedReviews.set(new Set());
    }
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.recenterLoop(), REVIEW_SETTLE_MS);
  }

  /** Once the track is at rest on the first or last copy, jump (invisibly, since the copies are
   *  identical) to the same card in the middle copy. Never while a finger is on it, or the jump
   *  would yank the track out from under the swipe. */
  private recenterLoop(): void {
    const el = this.reviewTrack()?.nativeElement;
    const count = this.reviews().data.length;
    if (!el || count <= 1 || this.touching) return;
    const step = this.reviewStep(el);
    const index = Math.round(el.scrollLeft / step);
    if (index >= count && index < count * 2) return;
    const target = count + (((index % count) + count) % count);
    el.scrollTo({ left: target * step, behavior: 'instant' });
    this.trackIndex = target;
  }

  /** Dots move the shortest way from the card on screen, rather than jumping to a fixed copy. */
  goToReview(index: number): void {
    const el = this.reviewTrack()?.nativeElement;
    if (!el) return;
    this.resumeAt = Date.now() + REVIEW_RESUME_AFTER_MS;
    const target = this.trackIndex + (index - this.activeReview());
    el.scrollTo({ left: target * this.reviewStep(el), behavior: this.reducedMotion ? 'instant' : 'smooth' });
  }

  onReviewTouchStart(): void {
    this.touching = true;
    clearTimeout(this.settleTimer);
  }

  onReviewTouchEnd(): void {
    this.touching = false;
    this.resumeAt = Date.now() + REVIEW_RESUME_AFTER_MS;
    // A tap that ends without moving fires no further scroll events to settle on.
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.recenterLoop(), REVIEW_SETTLE_MS);
  }

  /** Always sliding forward, wrapping from the last review straight on to the first. Holds while
   *  a finger is on the track, for a few seconds after, while a review is open, and while the app
   *  is in the background. With reduced motion on it still advances, just without the slide. */
  private startReviewAutoplay(): void {
    this.stopReviewAutoplay();
    if (this.reviews().data.length <= 1) return;
    this.reviewTimer = setInterval(() => {
      if (this.touching || Date.now() < this.resumeAt || this.expandedReviews().size) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const el = this.reviewTrack()?.nativeElement;
      if (!el) return;
      el.scrollTo({ left: (this.trackIndex + 1) * this.reviewStep(el), behavior: this.reducedMotion ? 'instant' : 'smooth' });
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

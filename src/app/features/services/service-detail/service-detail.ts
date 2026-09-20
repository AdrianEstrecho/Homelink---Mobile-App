import { DecimalPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAward, LucideCalendarCheck, LucideClock, LucideShieldCheck, LucideTimer } from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { PricePipe } from '../../../core/price.pipe';
import { Service } from '../../../core/product.model';
import { scrollAppToTop } from '../../../core/scroll-top.util';
import { ErrorState } from '../../../shared/error-state/error-state';
import { RevealDirective } from '../../../shared/reveal.directive';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { ServiceCard } from '../../../shared/service-card/service-card';
import { ServiceCategoryIcon } from '../../../shared/service-category-icon/service-category-icon';
import { Skeleton } from '../../../shared/skeleton/skeleton';

/** The booking flow, told as three steps — see ServiceBook for the real thing. */
const STEPS = [
  { title: 'Pick a date and time', body: 'Open slots are shown for the day you choose, so you book a time we can actually make.' },
  { title: 'A verified technician arrives', body: 'We match the job to a vetted pro and confirm your service address before the visit.' },
  { title: 'Pay securely, work guaranteed', body: 'Settle up in the app. Every job is covered by our satisfaction guarantee.' },
] as const;

/**
 * Read-only counterpart to ProductDetail for a service: everything a customer
 * needs to size up the job before committing to the booking form. The `Book
 * Service` shortcut on the card still jumps straight to /services/:slug/book,
 * so this page is the "tell me more first" path rather than a new gate.
 */
@Component({
  selector: 'app-service-detail',
  imports: [
    RouterLink,
    DecimalPipe,
    ErrorState,
    RevealDirective,
    SafeImage,
    ServiceCard,
    ServiceCategoryIcon,
    Skeleton,
    PricePipe,
    LucideAward,
    LucideCalendarCheck,
    LucideClock,
    LucideShieldCheck,
    LucideTimer,
  ],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetail {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  protected readonly steps = STEPS;

  private slug = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly service = signal<Service | null>(null);
  protected readonly error = signal(false);
  protected readonly related = signal<Service[]>([]);

  constructor() {
    // The page rises into view (.sheet-up); starting it halfway down the
    // previous screen's scroll position would clip that entrance.
    scrollAppToTop();

    effect(() => {
      const slugValue = this.slug().get('slug');
      if (!slugValue) return;
      this.loadService(slugValue);
    });
  }

  private loadService(slugValue: string): void {
    this.service.set(null);
    this.error.set(false);
    this.related.set([]);

    this.api
      .get<Service>(`/services/${slugValue}`)
      .then((s) => {
        this.service.set(s);
        this.api
          .get<Service[]>(`/services?category=${encodeURIComponent(s.category)}`)
          .then((data) => this.related.set(data.filter((x) => x.id !== s.id).slice(0, 4)))
          .catch(() => this.related.set([]));
      })
      .catch(() => this.error.set(true));
  }

  retry(): void {
    const slugValue = this.slug().get('slug');
    if (slugValue) this.loadService(slugValue);
  }

  /** Rough banding used for the "job size" line — matches the Services filters. */
  durationLabel(hours: number): string {
    if (hours <= 2) return 'Quick job';
    if (hours <= 4) return 'Half-day job';
    return 'Full-day job';
  }
}

import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LucideAward,
  LucideCalendarCheck,
  LucideCheck,
  LucideClipboardList,
  LucideClock,
  LucideCreditCard,
  LucideMapPin,
  LucideShieldCheck,
  LucideTag,
  LucideWrench,
} from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { paragraphs, specEntries, toHighlights } from '../../../core/catalog-specs.util';
import { formatPrice } from '../../../core/format.util';
import { PricePipe } from '../../../core/price.pipe';
import { Service } from '../../../core/product.model';
import { scrollAppToTop } from '../../../core/scroll-top.util';
import { ErrorState } from '../../../shared/error-state/error-state';
import { RevealDirective } from '../../../shared/reveal.directive';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { ServiceCard } from '../../../shared/service-card/service-card';
import { ServiceCategoryIcon } from '../../../shared/service-category-icon/service-category-icon';
import { Skeleton } from '../../../shared/skeleton/skeleton';

const TABS = ['Overview', 'Service Details', 'How It Works'] as const;
type Tab = (typeof TABS)[number];

/** How many detail rows get pulled up under the photo as an at-a-glance summary; the rest stay
 *  in the Service Details tab. */
const QUICK_DETAIL_COUNT = 4;

const DEFAULT_GUARANTEE = 'Every job is backed by our service guarantee — if something is not right, tell us and we will put it right.';

/** Mirrors the four numbered steps of ServiceBook's form, so this page sets the right expectation
 *  before the customer commits to the booking flow. */
const STEPS = [
  { icon: 'calendar', title: 'Pick a date & time', body: 'Choose from the open slots for the day that suits you — slots already taken are greyed out as you browse.' },
  { icon: 'map', title: 'Confirm the address', body: 'Save a service address or pick one you have used before, and leave any notes for the technician.' },
  { icon: 'card', title: 'Pay securely', body: 'Card, GCash, QR Ph, or bank transfer. Nothing is charged until you confirm the booking.' },
  { icon: 'wrench', title: 'A verified pro arrives', body: 'We assign a technician and keep you posted — follow the job from your Bookings page.' },
] as const;

/**
 * Ported from frontend/src/pages/ServiceDetail.jsx: everything a customer needs to size up the
 * job before committing to the booking form. The `Book Service` shortcut on the card still jumps
 * straight to /services/:slug/book, so this page is the "tell me more first" path.
 */
@Component({
  selector: 'app-service-detail',
  imports: [
    RouterLink,
    ErrorState,
    RevealDirective,
    SafeImage,
    ServiceCard,
    ServiceCategoryIcon,
    Skeleton,
    PricePipe,
    LucideAward,
    LucideCalendarCheck,
    LucideCheck,
    LucideClipboardList,
    LucideClock,
    LucideCreditCard,
    LucideMapPin,
    LucideShieldCheck,
    LucideTag,
    LucideWrench,
  ],
  templateUrl: './service-detail.html',
  styleUrl: './service-detail.css',
})
export class ServiceDetail {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly steps = STEPS;
  protected readonly quickDetailCount = QUICK_DETAIL_COUNT;
  protected readonly defaultGuarantee = DEFAULT_GUARANTEE;

  private slug = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly service = signal<Service | null>(null);
  protected readonly error = signal(false);
  protected readonly related = signal<Service[]>([]);
  protected readonly tab = signal<Tab>('Overview');

  protected readonly specs = computed(() => specEntries(this.service()?.specifications));
  protected readonly quickDetails = computed(() => this.specs().slice(0, QUICK_DETAIL_COUNT));
  protected readonly inclusions = computed(() => toHighlights(this.service()?.highlights));
  protected readonly requirements = computed(() => toHighlights(this.service()?.requirements));
  protected readonly descriptionParagraphs = computed(() => paragraphs(this.service()?.description));
  protected readonly hours = computed(() => Number(this.service()?.duration_hours ?? 0).toFixed(1));

  /** What staff recorded for this service, followed by the fixed terms every booking runs under
   *  (slot window from /bookings/availability, methods from PaymentMethodPicker), so the tab
   *  reads as one table rather than two half-empty ones. */
  protected readonly detailRows = computed(() => {
    const s = this.service();
    if (!s) return [];
    return [
      ...this.specs(),
      { key: 'term-category', label: 'Category', value: s.category },
      { key: 'term-duration', label: 'Typical duration', value: `~${this.hours()} hours` },
      { key: 'term-price', label: 'Starting price', value: formatPrice(s.base_price) },
      { key: 'term-slots', label: 'Booking slots', value: '8:00 AM – 4:00 PM, daily' },
      { key: 'term-tech', label: 'Technician', value: 'Verified HomeLink pro' },
      { key: 'term-payment', label: 'Payment', value: 'Card, GCash, QR Ph, or bank transfer' },
    ];
  });

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
    this.tab.set('Overview');

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
}

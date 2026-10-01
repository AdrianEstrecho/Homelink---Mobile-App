import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideArrowRight,
  LucideCalendarCheck,
  LucideClock,
  LucideCreditCard,
  LucideMail,
  LucidePhone,
  LucideQuote,
  LucideSearch,
  LucideShield,
  LucideShoppingCart,
  LucideStar,
  LucideTruck,
  LucideUserCheck,
  LucideWrench,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Faq } from '../../core/faq.model';
import { Product, Service } from '../../core/product.model';
import { CountUp } from '../../shared/count-up/count-up';
import { ErrorState } from '../../shared/error-state/error-state';
import { FaqAccordion } from '../../shared/faq-accordion/faq-accordion';
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

const FEATURES = [
  { icon: 'shield', title: 'Verified Technicians', desc: 'All service providers are verified and trained professionals, background-checked before they ever step into your home.' },
  { icon: 'truck', title: 'Reliable Delivery', desc: 'Track your orders from purchase to doorstep delivery, with real-time updates every step of the way.' },
  { icon: 'wrench', title: 'Expert Services', desc: 'Book installation, cleaning, and repair services easily, with pros matched to the job you need done.' },
  { icon: 'star', title: 'Quality Products', desc: 'Curated home improvement products from trusted brands, vetted for durability and performance.' },
] as const;

type StepIcon = 'search' | 'card' | 'truck' | 'wrench' | 'calendar' | 'user' | 'activity';

/** Ported from frontend/src/components/home/HowItWorks.jsx — mirrors the real customer flows
 *  (ORDER_STEPS / BOOKING_STEPS in backend/utils/tracking.js and the PaymentMethodPicker). */
const HOW_IT_WORKS: {
  key: string;
  label: string;
  cta: { to: string; text: string };
  steps: { icon: StepIcon; title: string; desc: string }[];
}[] = [
  {
    key: 'products',
    label: 'Buying products',
    cta: { to: '/products', text: 'Browse Products' },
    steps: [
      { icon: 'search', title: 'Find what you need', desc: 'Browse by category, compare specs, and read reviews from verified buyers.' },
      { icon: 'card', title: 'Check out securely', desc: 'Pay by card, GCash, QR Ph, bank transfer, or cash on delivery, and apply voucher codes at checkout.' },
      { icon: 'truck', title: 'Track your delivery', desc: 'Follow your order from processing to shipped to delivered, with an estimated arrival date.' },
      { icon: 'wrench', title: 'Add installation', desc: 'Book a verified technician to install what you bought, all from the same account.' },
    ],
  },
  {
    key: 'services',
    label: 'Booking a service',
    cta: { to: '/services', text: 'Book a Service' },
    steps: [
      { icon: 'search', title: 'Choose a service', desc: 'Installation, cleaning, repair, or maintenance, with starting prices shown upfront.' },
      { icon: 'calendar', title: 'Pick your schedule', desc: 'Choose a date and time that suits you. First-time bookings get 15% off automatically.' },
      { icon: 'user', title: 'Get a verified pro', desc: 'We confirm your booking and assign a background-checked technician matched to the job.' },
      { icon: 'activity', title: 'Track to completion', desc: 'Follow the job from confirmed to in progress to completed, right from your account.' },
    ],
  },
];

interface FeaturedReview {
  id: string;
  rating: number;
  comment: string;
  first_name: string;
  last_name: string;
  product_name: string;
}

/** Fallbacks match the defaults served by GET /promos/location. */
const DEFAULT_CONTACT = { phone: '(02) 8123-4567', email: 'support@homelink.com' };

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
    FaqAccordion,
    StarRating,
    ProductCardSkeleton,
    ReviewCardSkeleton,
    ServiceCardSkeleton,
    LucideActivity,
    LucideCalendarCheck,
    LucideClock,
    LucideCreditCard,
    LucideMail,
    LucidePhone,
    LucideQuote,
    LucideSearch,
    LucideShoppingCart,
    LucideUserCheck,
    LucideArrowRight,
    LucideShield,
    LucideTruck,
    LucideWrench,
    LucideStar,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private api = inject(ApiService);

  protected readonly stats = STATS;
  protected readonly features = FEATURES;
  protected readonly howItWorks = HOW_IT_WORKS;
  protected readonly trackIndex = signal(0);

  protected readonly featured = signal<LoadState<Product>>({ data: [], loading: true, error: false });
  protected readonly services = signal<LoadState<Service>>({ data: [], loading: true, error: false });
  protected readonly reviews = signal<LoadState<FeaturedReview>>({ data: [], loading: true, error: false });
  protected readonly faqs = signal<Faq[]>([]);
  protected readonly contact = signal(DEFAULT_CONTACT);

  constructor() {
    this.loadFeatured();
    this.loadServices();
    this.loadReviews();
    this.api
      .get<Faq[]>('/faqs')
      .then((data) => this.faqs.set(data.slice(0, 5)))
      .catch(() => {});
    this.api
      .get<{ phone?: string; email?: string }>('/promos/location')
      .then((data) => this.contact.set({ phone: data.phone || DEFAULT_CONTACT.phone, email: data.email || DEFAULT_CONTACT.email }))
      .catch(() => {});
  }

  loadReviews(): void {
    this.reviews.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<FeaturedReview[]>('/reviews/featured')
      .then((data) => this.reviews.set({ data, loading: false, error: false }))
      .catch(() => this.reviews.set({ data: [], loading: false, error: true }));
  }

  initials(r: FeaturedReview): string {
    return `${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`;
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

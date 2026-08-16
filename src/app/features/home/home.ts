import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideHouse,
  LucideQuote,
  LucideShield,
  LucideStar,
  LucideTruck,
  LucideWrench,
  LucideZap,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Category, Product, Service } from '../../core/product.model';
import { CategoryIcon } from '../../shared/category-icon/category-icon';
import { CountUp } from '../../shared/count-up/count-up';
import { ErrorState } from '../../shared/error-state/error-state';
import { Hero } from '../../shared/hero/hero';
import { ProductCard } from '../../shared/product-card/product-card';
import { RevealDirective } from '../../shared/reveal.directive';
import { ServiceCard } from '../../shared/service-card/service-card';
import { CategorySkeleton } from '../../shared/skeleton/category-skeleton/category-skeleton';
import { ProductCardSkeleton } from '../../shared/skeleton/product-card-skeleton/product-card-skeleton';
import { ReviewCardSkeleton } from '../../shared/skeleton/review-card-skeleton/review-card-skeleton';
import { ServiceCardSkeleton } from '../../shared/skeleton/service-card-skeleton/service-card-skeleton';
import { StarRating } from '../../shared/star-rating/star-rating';

interface LoadState<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

interface FeaturedReview {
  id: string;
  rating: number;
  comment: string;
  first_name: string;
  last_name: string;
  product_name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
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
    CategoryIcon,
    ProductCardSkeleton,
    ServiceCardSkeleton,
    CategorySkeleton,
    ReviewCardSkeleton,
    LucideArrowRight,
    LucideShield,
    LucideTruck,
    LucideWrench,
    LucideStar,
    LucideZap,
    LucideHouse,
    LucideQuote,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private api = inject(ApiService);

  protected readonly stats = STATS;
  protected readonly features = FEATURES;
  protected readonly activeFeature = signal(0);

  protected readonly featured = signal<LoadState<Product>>({ data: [], loading: true, error: false });
  protected readonly services = signal<LoadState<Service>>({ data: [], loading: true, error: false });
  protected readonly categories = signal<LoadState<Category>>({ data: [], loading: true, error: false });
  protected readonly reviews = signal<LoadState<FeaturedReview>>({ data: [], loading: true, error: false });
  protected readonly announcements = signal<Announcement[]>([]);

  constructor() {
    this.loadFeatured();
    this.loadServices();
    this.loadCategories();
    this.loadReviews();
    this.api
      .get<Announcement[]>('/announcements')
      .then((data) => this.announcements.set(data))
      .catch(() => {});
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
      .get<Service[]>('/services?limit=4')
      .then((data) => this.services.set({ data: data.slice(0, 4), loading: false, error: false }))
      .catch(() => this.services.set({ data: [], loading: false, error: true }));
  }

  loadCategories(): void {
    this.categories.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<Category[]>('/products/categories')
      .then((data) => this.categories.set({ data, loading: false, error: false }))
      .catch(() => this.categories.set({ data: [], loading: false, error: true }));
  }

  loadReviews(): void {
    this.reviews.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<FeaturedReview[]>('/reviews/featured')
      .then((data) => this.reviews.set({ data, loading: false, error: false }))
      .catch(() => this.reviews.set({ data: [], loading: false, error: true }));
  }

  topCategories(): Category[] {
    return this.categories().data.slice(0, 10);
  }
}

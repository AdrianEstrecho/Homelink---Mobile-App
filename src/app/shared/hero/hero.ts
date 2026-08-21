import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideSearch, LucideShoppingCart, LucideSlidersHorizontal, LucideTag } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { Category } from '../../core/product.model';
import { categoryAccent } from '../category-accent';
import { CategoryIcon } from '../category-icon/category-icon';
import { CategorySkeleton } from '../skeleton/category-skeleton/category-skeleton';

interface CategoryState {
  data: Category[];
  loading: boolean;
  error: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
}

const BANNER_AUTOPLAY_MS = 10_000;

/**
 * The home tab's "shop front": greeting + cart, search, categories, and a
 * promo banner built from real /announcements data. Replaces the earlier
 * marketing-style hero — this is a functional storefront header, not a
 * landing-page pitch, so it's self-sufficient (loads its own categories and
 * announcements) rather than a purely presentational child of Home.
 */
@Component({
  selector: 'app-hero',
  imports: [
    FormsModule,
    RouterLink,
    CategoryIcon,
    CategorySkeleton,
    LucideSearch,
    LucideSlidersHorizontal,
    LucideShoppingCart,
    LucideArrowRight,
    LucideTag,
  ],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private destroyRef = inject(DestroyRef);

  protected readonly user = this.auth.user;
  protected readonly cartCount = this.cart.count;

  protected readonly searchQuery = signal('');
  protected readonly activeBanner = signal(0);
  protected readonly bannerScroll = viewChild<ElementRef<HTMLElement>>('bannerScroll');

  protected readonly categories = signal<CategoryState>({ data: [], loading: true, error: false });
  protected readonly announcements = signal<Announcement[]>([]);

  protected readonly categoryAccent = categoryAccent;

  private bannerTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.loadCategories();
    this.api
      .get<Announcement[]>('/announcements')
      .then((data) => {
        this.announcements.set(data);
        this.startBannerAutoplay();
      })
      .catch(() => {});
    this.destroyRef.onDestroy(() => this.stopBannerAutoplay());
  }

  loadCategories(): void {
    this.categories.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<Category[]>('/products/categories')
      .then((data) => this.categories.set({ data, loading: false, error: false }))
      .catch(() => this.categories.set({ data: [], loading: false, error: true }));
  }

  onSearch(event: Event): void {
    event.preventDefault();
    const q = this.searchQuery().trim();
    this.router.navigate(['/products'], q ? { queryParams: { search: q } } : {});
  }

  onBannerScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el.clientWidth) return;
    this.activeBanner.set(Math.round(el.scrollLeft / el.clientWidth));
  }

  private startBannerAutoplay(): void {
    this.stopBannerAutoplay();
    if (this.announcements().length <= 1) return;
    this.bannerTimer = setInterval(() => this.advanceBanner(), BANNER_AUTOPLAY_MS);
  }

  private stopBannerAutoplay(): void {
    if (this.bannerTimer) clearInterval(this.bannerTimer);
  }

  private advanceBanner(): void {
    const count = this.announcements().length;
    if (count === 0) return;
    const next = (this.activeBanner() + 1) % count;
    this.activeBanner.set(next);
    const el = this.bannerScroll()?.nativeElement;
    el?.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }
}

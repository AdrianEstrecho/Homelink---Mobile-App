import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowRight, LucideSearch, LucideShoppingCart, LucideTag, LucideX } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { Category } from '../../core/product.model';
import { DRILL_DOWN_STATE } from '../../core/shell-route.util';
import { categoryAccent } from '../category-accent';
import { CategoryIcon } from '../category-icon/category-icon';
import { HeroSky } from '../hero-sky/hero-sky';
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

// How far the sky has to scroll up, as a share of its height, for dawn to fully break.
const DAWN_SCROLL_SHARE = 0.75;

const BANNER_AUTOPLAY_MS = 10_000;

/**
 * The home tab's "shop front": greeting, search and cart, categories, and a
 * promo banner built from real /announcements data. Replaces the earlier
 * marketing-style hero — this is a functional storefront header, not a
 * landing-page pitch, so it's self-sufficient (loads its own categories and
 * announcements) rather than a purely presentational child of Home. The web
 * hero's "Homeowners Served" pill was left off here on purpose.
 *
 * The greeting, search and cart sit on the web hero's night sky (HeroSky), with the
 * house rising out of a mist at its foot. Scrolling writes --progress (0-1)
 * onto the sky, which fades the stars and warms the horizon into a sunrise.
 * The web's product-card collage and category chips aren't carried over: the
 * Categories row and Featured products just below already do those jobs.
 */
@Component({
  selector: 'app-hero',
  imports: [
    FormsModule,
    RouterLink,
    CategoryIcon,
    CategorySkeleton,
    HeroSky,
    LucideSearch,
    LucideX,
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
  protected readonly searchOpen = signal(false);
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly activeBanner = signal(0);
  protected readonly bannerScroll = viewChild<ElementRef<HTMLElement>>('bannerScroll');

  protected readonly categories = signal<CategoryState>({ data: [], loading: true, error: false });
  protected readonly announcements = signal<Announcement[]>([]);
  private readonly sky = viewChild.required<ElementRef<HTMLElement>>('sky');

  protected readonly categoryAccent = categoryAccent;
  protected readonly drillDown = DRILL_DOWN_STATE;

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
    afterNextRender(() => this.trackDawn());
  }

  /** Writes how far the sky has scrolled away (0-1, eased) as --progress. Phones scroll the
   *  window; wider screens scroll .app-scroll-region instead, so the listener is a capturing one
   *  on the document, which hears both. */
  private trackDawn(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const sky = this.sky().nativeElement;
    const region = sky.closest('.app-scroll-region') as HTMLElement | null;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let ticking = false;

    const update = () => {
      ticking = false;
      // Where the sky's top sits before any scrolling: just under the topbar.
      const restTop = region ? region.getBoundingClientRect().top + parseFloat(getComputedStyle(region).paddingTop) : 0;
      const rect = sky.getBoundingClientRect();
      const raw = Math.min(1, Math.max(0, (restTop - rect.top) / (rect.height * DAWN_SCROLL_SHARE)));
      sky.style.setProperty('--progress', easeOutCubic(raw).toFixed(4));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    });
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
    // Nothing typed yet: keep the field open rather than jumping to the full product list.
    if (!q) {
      this.searchInput().nativeElement.focus();
      return;
    }
    this.router.navigate(['/products'], { queryParams: { search: q }, state: DRILL_DOWN_STATE });
  }

  /** While folded, the search icon opens the field instead of submitting it. Focus is moved in
   *  the same tap, which is what lets a phone raise its keyboard. */
  onSearchIcon(event: Event): void {
    if (this.searchOpen()) return;
    event.preventDefault();
    this.searchOpen.set(true);
    this.searchInput().nativeElement.focus();
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchInput().nativeElement.blur();
  }

  /** Tapping away from an empty field folds it back up; one with text in it stays open. */
  onSearchFocusOut(event: FocusEvent): void {
    const form = event.currentTarget as HTMLElement;
    if (form.contains(event.relatedTarget as Node | null)) return;
    if (!this.searchQuery().trim()) this.searchOpen.set(false);
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

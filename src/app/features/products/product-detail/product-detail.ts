import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideCircleX,
  LucideHeadset,
  LucideHeart,
  LucidePackageCheck,
  LucideRotateCcw,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideStar,
  LucideTriangleAlert,
  LucideTruck,
  LucideWrench,
  LucideZap,
} from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { CartService } from '../../../core/cart.service';
import { paragraphs, specEntries, toHighlights } from '../../../core/catalog-specs.util';
import { PricePipe } from '../../../core/price.pipe';
import { Product } from '../../../core/product.model';
import { requireRole } from '../../../core/require-role';
import { scrollAppToTop } from '../../../core/scroll-top.util';
import { ToastService } from '../../../core/toast.service';
import { WishlistService } from '../../../core/wishlist.service';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { ErrorState } from '../../../shared/error-state/error-state';
import { RevealDirective } from '../../../shared/reveal.directive';
import { SafeImage } from '../../../shared/safe-image/safe-image';
import { Skeleton } from '../../../shared/skeleton/skeleton';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { ProductCard } from '../../../shared/product-card/product-card';

interface ReviewEntry {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  first_name: string;
  last_name: string;
}

interface ReviewSummary {
  reviews: ReviewEntry[];
  average: number;
  count: number;
}

const TABS = ['Overview', 'Specifications', 'Delivery & Warranty', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

/** How many spec rows get pulled up under the photo as an at-a-glance summary; the rest stay in
 *  the Specifications tab. */
const QUICK_SPEC_COUNT = 4;

const DEFAULT_WARRANTY = 'Covered by the manufacturer’s standard warranty. Keep your HomeLink receipt as proof of purchase.';

type StockTone = 'out' | 'low' | 'in';

function stockState(stock: number): { tone: StockTone; label: string; detail: string; className: string } {
  if (stock <= 0) return { tone: 'out', label: 'Out of stock', detail: 'Ask us about restock dates before ordering.', className: 'text-red-600' };
  if (stock <= 5) return { tone: 'low', label: `Only ${stock} left in stock`, detail: 'Order soon — this one is running low.', className: 'text-amber-600' };
  return { tone: 'in', label: `${stock} in stock`, detail: 'Ready to ship from our Metro Manila warehouse.', className: 'text-green-600' };
}

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    DatePipe,
    ErrorState,
    RevealDirective,
    ProductCard,
    SafeImage,
    Skeleton,
    StarRating,
    ConfirmDialog,
    PricePipe,
    LucideShoppingCart,
    LucideTruck,
    LucideShieldCheck,
    LucideWrench,
    LucideStar,
    LucideZap,
    LucideHeart,
    LucideCheck,
    LucidePackageCheck,
    LucideTriangleAlert,
    LucideCircleX,
    LucideRotateCcw,
    LucideHeadset,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);
  private toast = inject(ToastService);

  protected readonly tabs = TABS;
  protected readonly quickSpecCount = QUICK_SPEC_COUNT;
  protected readonly defaultWarranty = DEFAULT_WARRANTY;

  private slug = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly product = signal<Product | null>(null);
  protected readonly error = signal(false);
  protected readonly qty = signal(1);
  protected readonly reviews = signal<ReviewSummary | null>(null);
  protected readonly related = signal<Product[]>([]);
  protected readonly tab = signal<Tab>('Overview');
  protected readonly confirmUnfavorite = signal(false);
  protected readonly confirmAddToCart = signal(false);

  protected readonly specs = computed(() => specEntries(this.product()?.specifications));
  protected readonly quickSpecs = computed(() => this.specs().slice(0, QUICK_SPEC_COUNT));
  protected readonly highlights = computed(() => toHighlights(this.product()?.highlights));
  protected readonly descriptionParagraphs = computed(() => paragraphs(this.product()?.description));
  protected readonly stock = computed(() => stockState(this.product()?.stock ?? 0));

  /** Five counters, one per star, so a thin rating still renders a full 5→1 breakdown. */
  protected readonly ratingBreakdown = computed(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const r of this.reviews()?.reviews ?? []) {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1] += 1;
    }
    return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts[stars - 1] }));
  });

  constructor() {
    // The page rises into view (.sheet-up); starting it halfway down the
    // previous screen's scroll position would clip that entrance.
    scrollAppToTop();

    effect(() => {
      const slugValue = this.slug().get('slug');
      if (!slugValue) return;
      this.loadProduct(slugValue);
    });
  }

  private loadProduct(slugValue: string): void {
    this.product.set(null);
    this.error.set(false);
    this.tab.set('Overview');
    this.reviews.set(null);
    this.related.set([]);

    this.api
      .get<Product>(`/products/${slugValue}`)
      .then((p) => {
        this.product.set(p);
        this.qty.set(1);
        this.api
          .get<ReviewSummary>(`/reviews/product/${p.id}`)
          .then((r) => this.reviews.set(r))
          .catch(() => this.reviews.set({ reviews: [], average: 0, count: 0 }));
        const params = p.category_slug ? `category=${p.category_slug}` : 'featured=true';
        this.api
          .get<Product[]>(`/products?${params}&limit=5`)
          .then((data) => this.related.set(data.filter((x) => x.id !== p.id).slice(0, 4)))
          .catch(() => this.related.set([]));
      })
      .catch(() => this.error.set(true));
  }

  retry(): void {
    const slugValue = this.slug().get('slug');
    if (slugValue) this.loadProduct(slugValue);
  }

  wishlisted(): boolean {
    const p = this.product();
    return p ? this.wishlist.has(p.id) : false;
  }

  decrementQty(): void {
    this.qty.update((v) => Math.max(1, v - 1));
  }

  incrementQty(): void {
    const p = this.product();
    if (!p) return;
    this.qty.update((v) => Math.min(p.stock, v + 1));
  }

  private addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.cart.addItem(p, this.qty());
    if (this.wishlisted()) this.wishlist.removeItem(p.id);
    this.toast.showToast({
      icon: 'check',
      iconClass: 'bg-green-100 text-green-600',
      image: p.image,
      title: 'Added to cart',
      description: `${this.qty()} × ${p.name}`,
      action: { label: 'View Cart', to: '/cart' },
    });
  }

  async handleAdd(): Promise<void> {
    if ((await requireRole(this.auth, this.toast, ['customer'])) !== 'ok') return;
    if (this.wishlisted()) {
      this.confirmAddToCart.set(true);
      return;
    }
    this.addToCart();
  }

  confirmAddToCartAction(): void {
    this.addToCart();
    this.confirmAddToCart.set(false);
  }

  async handleBuyNow(): Promise<void> {
    const p = this.product();
    if (!p) return;
    if ((await requireRole(this.auth, this.toast, ['customer'])) !== 'ok') return;
    this.cart.addItem(p, this.qty());
    if (this.wishlisted()) this.wishlist.removeItem(p.id);
    this.router.navigateByUrl('/checkout');
  }

  async handleWishlistToggle(): Promise<void> {
    const p = this.product();
    if (!p) return;
    if ((await requireRole(this.auth, this.toast, ['customer'])) !== 'ok') return;
    if (this.wishlisted()) {
      this.confirmUnfavorite.set(true);
      return;
    }
    this.wishlist.addItem(p);
  }

  confirmUnfavoriteAction(): void {
    const p = this.product();
    if (!p) return;
    this.wishlist.removeItem(p.id);
    this.confirmUnfavorite.set(false);
  }
}

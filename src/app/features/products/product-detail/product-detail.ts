import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideChevronRight,
  LucideHeart,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideStar,
  LucideTruck,
  LucideWrench,
  LucideZap,
} from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { CartService } from '../../../core/cart.service';
import { PricePipe } from '../../../core/price.pipe';
import { Product } from '../../../core/product.model';
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

const TABS = ['Description', 'Specifications', 'Reviews'] as const;
type Tab = (typeof TABS)[number];

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
    LucideChevronRight,
    LucideTruck,
    LucideShieldCheck,
    LucideWrench,
    LucideStar,
    LucideZap,
    LucideHeart,
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

  private slug = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly product = signal<Product | null>(null);
  protected readonly error = signal(false);
  protected readonly qty = signal(1);
  protected readonly reviews = signal<ReviewSummary | null>(null);
  protected readonly related = signal<Product[]>([]);
  protected readonly tab = signal<Tab>('Description');
  protected readonly confirmUnfavorite = signal(false);
  protected readonly confirmAddToCart = signal(false);

  constructor() {
    effect(() => {
      const slugValue = this.slug().get('slug');
      if (!slugValue) return;
      this.loadProduct(slugValue);
    });
  }

  private loadProduct(slugValue: string): void {
    this.product.set(null);
    this.error.set(false);
    this.tab.set('Description');
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

  specs(): [string, string][] {
    const p = this.product();
    return p?.specifications ? (Object.entries(p.specifications) as [string, string][]) : [];
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

  handleAdd(): void {
    if (this.auth.user()?.role !== 'customer') {
      this.router.navigateByUrl('/login');
      return;
    }
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

  handleBuyNow(): void {
    const p = this.product();
    if (!p) return;
    if (this.auth.user()?.role !== 'customer') {
      this.router.navigateByUrl('/login');
      return;
    }
    this.cart.addItem(p, this.qty());
    if (this.wishlisted()) this.wishlist.removeItem(p.id);
    this.router.navigateByUrl('/checkout');
  }

  handleWishlistToggle(): void {
    const p = this.product();
    if (!p) return;
    if (this.auth.user()?.role !== 'customer') {
      this.router.navigateByUrl('/login');
      return;
    }
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

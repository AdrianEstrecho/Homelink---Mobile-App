import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideHeart, LucideShoppingCart, LucideStar } from '@lucide/angular';

import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { PricePipe } from '../../core/price.pipe';
import { Product } from '../../core/product.model';
import { ToastService } from '../../core/toast.service';
import { WishlistService } from '../../core/wishlist.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';
import { SafeImage } from '../safe-image/safe-image';
import { StarRating } from '../star-rating/star-rating';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, SafeImage, StarRating, ConfirmDialog, PricePipe, LucideShoppingCart, LucideStar, LucideHeart],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private auth = inject(AuthService);
  private router = inject(Router);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);
  private toast = inject(ToastService);

  readonly product = input.required<Product>();

  protected readonly confirmUnfavorite = signal(false);
  protected readonly confirmAddToCart = signal(false);

  outOfStock(): boolean {
    return this.product().stock === 0;
  }

  lowStock(): boolean {
    return !this.outOfStock() && this.product().stock <= 5;
  }

  wishlisted(): boolean {
    return this.wishlist.has(this.product().id);
  }

  private addToCart(): void {
    const product = this.product();
    this.cart.addItem(product);
    if (this.wishlisted()) this.wishlist.removeItem(product.id);
    this.toast.showToast({
      icon: 'check',
      iconClass: 'bg-green-100 text-green-600',
      image: product.image,
      title: 'Added to cart',
      description: product.name,
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

  handleWishlistToggle(event: Event): void {
    event.preventDefault();
    if (this.auth.user()?.role !== 'customer') {
      this.router.navigateByUrl('/login');
      return;
    }
    if (this.wishlisted()) {
      this.confirmUnfavorite.set(true);
      return;
    }
    this.wishlist.addItem(this.product());
  }

  confirmUnfavoriteAction(): void {
    this.wishlist.removeItem(this.product().id);
    this.confirmUnfavorite.set(false);
  }
}

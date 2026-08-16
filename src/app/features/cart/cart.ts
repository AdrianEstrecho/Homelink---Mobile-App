import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideLock, LucideMinus, LucidePlus, LucideShieldCheck, LucideShoppingBag, LucideTrash2, LucideTruck } from '@lucide/angular';

import { CartItem, CartService } from '../../core/cart.service';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { RevealDirective } from '../../shared/reveal.directive';
import { SafeImage } from '../../shared/safe-image/safe-image';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, RevealDirective, SafeImage, ConfirmDialog, PricePipe, LucideShoppingBag, LucideTrash2, LucideMinus, LucidePlus, LucideLock, LucideShieldCheck, LucideTruck],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  protected cart = inject(CartService);
  private toast = inject(ToastService);

  protected readonly items = this.cart.items;
  protected readonly total = this.cart.total;
  protected readonly count = this.cart.count;

  protected readonly confirmClear = signal(false);
  protected readonly removeTarget = signal<CartItem | null>(null);

  maxQty(item: CartItem): number {
    return item.stock ?? Infinity;
  }

  lowStock(item: CartItem): boolean {
    return item.stock != null && item.stock > 0 && item.stock <= 5;
  }

  requestRemove(item: CartItem): void {
    this.removeTarget.set(item);
  }

  confirmRemove(): void {
    const item = this.removeTarget();
    if (!item) return;
    this.cart.removeItem(item.productId);
    this.removeTarget.set(null);
    this.toast.showToast({
      icon: 'trash',
      iconClass: 'bg-red-100 text-red-600',
      title: 'Removed from cart',
      description: item.name,
    });
  }

  confirmClearCart(): void {
    this.cart.clearCart();
    this.confirmClear.set(false);
  }
}

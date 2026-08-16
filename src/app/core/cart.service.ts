import { Injectable, computed, effect, signal } from '@angular/core';

import { Product } from './product.model';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  quantity: number;
  stock: number;
}

const CART_KEY = 'homelink_cart';

/**
 * Ported from frontend/src/context/CartContext.jsx. Guest-friendly, not
 * backend-persisted — pure localStorage, same key/shape as the React app so
 * a cart started on the web still works if the same browser opens the
 * Angular dev build.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(this.load());
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price * i.quantity, 0));
  readonly count = computed(() => this.items().reduce((s, i) => s + i.quantity, 0));

  constructor() {
    effect(() => {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items()));
    });
  }

  private load(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  addItem(product: Product, qty = 1): void {
    this.items.update((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          slug: product.slug,
          quantity: qty,
          stock: product.stock,
        },
      ];
    });
  }

  removeItem(productId: string): void {
    this.items.update((prev) => prev.filter((i) => i.productId !== productId));
  }

  updateQty(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    this.items.update((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  clearCart(): void {
    this.items.set([]);
  }
}

import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Product } from './product.model';

/**
 * Ported from frontend/src/context/WishlistContext.jsx. Backend-persisted,
 * customer-only; refetches whenever the logged-in user changes, and does
 * optimistic add/remove with rollback on failure.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly items = signal<Product[]>([]);
  readonly count = computed(() => this.items().length);

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user?.role !== 'customer') {
        this.items.set([]);
        return;
      }
      this.api
        .get<Product[]>('/wishlist/my')
        .then((items) => this.items.set(items))
        .catch(() => this.items.set([]));
    });
  }

  has(productId: string): boolean {
    return this.items().some((i) => i.id === productId);
  }

  async addItem(product: Product): Promise<void> {
    if (!this.has(product.id)) {
      this.items.update((prev) => [product, ...prev]);
    }
    try {
      await this.api.post('/wishlist', { productId: product.id });
    } catch {
      this.items.update((prev) => prev.filter((i) => i.id !== product.id));
    }
  }

  async removeItem(productId: string): Promise<void> {
    const prevItems = this.items();
    this.items.update((prev) => prev.filter((i) => i.id !== productId));
    try {
      await this.api.delete(`/wishlist/${productId}`);
    } catch {
      this.items.set(prevItems);
    }
  }
}

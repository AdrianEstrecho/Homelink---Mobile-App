import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Product } from './product.model';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  quantity: number;
  stock: number;
  /** Ticked for checkout; only selected items are ordered. */
  selected: boolean;
  /** The top-level category (a "Split Type" item files under "Air Conditioners"); null when uncategorised. */
  categoryName?: string | null;
  categorySlug?: string | null;
}

// Where builds before the account cart kept it, keyed by device rather than account.
const LEGACY_CART_KEY = 'homelink_cart';

/**
 * Ported from frontend/src/context/CartContext.jsx. Backend-persisted and customer-only, like
 * the wishlist: refetches whenever the signed-in account changes, updates optimistically, then
 * adopts the cart each response sends back (or refetches if the request failed). Because it
 * lives on the account, the cart and its checkout ticks are the same on the website.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly items = signal<CartItem[]>([]);
  /** False until the signed-in account's cart has been fetched once. */
  readonly loaded = signal(false);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price * i.quantity, 0));
  readonly count = computed(() => this.items().reduce((s, i) => s + i.quantity, 0));

  readonly selectedItems = computed(() => this.items().filter((i) => i.selected));
  readonly selectedTotal = computed(() => this.selectedItems().reduce((s, i) => s + i.price * i.quantity, 0));
  readonly selectedCount = computed(() => this.selectedItems().reduce((s, i) => s + i.quantity, 0));

  /** The customer whose cart this is; null when signed out or signed in as staff. */
  private readonly accountId = computed(() => {
    const user = this.auth.user();
    return user?.role === 'customer' ? user.id : null;
  });

  constructor() {
    // Every add-to-cart entry point requires a customer sign-in, so there's no guest cart to
    // keep -- carrying the old device cart over could hand one account's items to the next.
    localStorage.removeItem(LEGACY_CART_KEY);

    effect(() => {
      const account = this.accountId();
      untracked(() => {
        this.items.set([]);
        this.loaded.set(!account);
        if (account) this.refresh();
      });
    });
  }

  refresh(): void {
    const account = this.accountId();
    if (!account) return;
    this.api
      .get<CartItem[]>('/cart/my')
      .then((items) => {
        if (this.accountId() === account) this.items.set(items);
      })
      .catch(() => {
        if (this.accountId() === account) this.items.set([]);
      })
      .finally(() => {
        if (this.accountId() === account) this.loaded.set(true);
      });
  }

  /** Adopts the cart a write sends back, unless the account changed while it was in flight. */
  private sync(request: Promise<CartItem[]>): void {
    const account = this.accountId();
    request
      .then((items) => {
        if (this.accountId() === account) this.items.set(items);
      })
      .catch(() => this.refresh());
  }

  addItem(product: Product, qty = 1): void {
    if (!this.accountId()) return;
    this.items.update((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        // Adding it again means the customer wants it, so it's ticked even if it wasn't.
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + qty, selected: true } : i));
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
          selected: true,
        },
      ];
    });
    this.sync(this.api.post<CartItem[]>('/cart', { productId: product.id, quantity: qty }));
  }

  removeItem(productId: string): void {
    if (!this.accountId()) return;
    this.items.update((prev) => prev.filter((i) => i.productId !== productId));
    this.sync(this.api.delete<CartItem[]>(`/cart/${productId}`));
  }

  /** Removes several lines at once (what an order just bought), leaving the rest of the cart. */
  removeItems(productIds: string[]): void {
    if (!this.accountId() || !productIds.length) return;
    const ids = new Set(productIds);
    this.items.update((prev) => prev.filter((i) => !ids.has(i.productId)));
    this.sync(this.api.delete<CartItem[]>('/cart', { productIds }));
  }

  updateQty(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    if (!this.accountId()) return;
    this.items.update((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    this.sync(this.api.put<CartItem[]>(`/cart/${productId}`, { quantity }));
  }

  clearCart(): void {
    if (!this.accountId()) return;
    this.items.set([]);
    this.sync(this.api.delete<CartItem[]>('/cart'));
  }

  /** Ticks or unticks items for checkout. */
  setSelected(productIds: string[], selected: boolean): void {
    if (!this.accountId() || !productIds.length) return;
    const ids = new Set(productIds);
    this.items.update((prev) => prev.map((i) => (ids.has(i.productId) ? { ...i, selected } : i)));
    this.sync(this.api.put<CartItem[]>('/cart/selection', { productIds, selected }));
  }

  toggleSelected(productId: string): void {
    const item = this.items().find((i) => i.productId === productId);
    if (item) this.setSelected([productId], !item.selected);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideLayoutGrid,
  LucideLoaderCircle,
  LucideLock,
  LucideMinus,
  LucidePlus,
  LucideShieldCheck,
  LucideShoppingBag,
  LucideTrash2,
  LucideTruck,
} from '@lucide/angular';

import { CartItem, CartService } from '../../core/cart.service';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { CategoryIcon } from '../../shared/category-icon/category-icon';
import { Checkbox } from '../../shared/checkbox/checkbox';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { RevealDirective } from '../../shared/reveal.directive';
import { SafeImage } from '../../shared/safe-image/safe-image';

interface CartCategory {
  slug: string;
  name: string;
  count: number;
}

const OTHER = { slug: 'other', name: 'Other' };

function categoryOf(item: CartItem): { slug: string; name: string } {
  return item.categorySlug ? { slug: item.categorySlug, name: item.categoryName ?? item.categorySlug } : OTHER;
}

/** The categories present in the cart, A–Z with "Other" (uncategorised products) last. */
function cartCategories(items: CartItem[]): CartCategory[] {
  const bySlug = new Map<string, CartCategory>();
  for (const item of items) {
    const { slug, name } = categoryOf(item);
    const entry = bySlug.get(slug) ?? { slug, name, count: 0 };
    entry.count += 1;
    bySlug.set(slug, entry);
  }
  return [...bySlug.values()].sort(
    (a, b) => Number(a.slug === OTHER.slug) - Number(b.slug === OTHER.slug) || a.name.localeCompare(b.name),
  );
}

@Component({
  selector: 'app-cart',
  imports: [
    RouterLink,
    RevealDirective,
    SafeImage,
    ConfirmDialog,
    Checkbox,
    CategoryIcon,
    PricePipe,
    LucideShoppingBag,
    LucideTrash2,
    LucideMinus,
    LucidePlus,
    LucideLock,
    LucideShieldCheck,
    LucideTruck,
    LucideLayoutGrid,
    LucideLoaderCircle,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  protected cart = inject(CartService);
  private toast = inject(ToastService);

  protected readonly items = this.cart.items;
  protected readonly count = this.cart.count;
  protected readonly selectedItems = this.cart.selectedItems;
  protected readonly selectedTotal = this.cart.selectedTotal;
  protected readonly selectedCount = this.cart.selectedCount;

  protected readonly confirmClear = signal(false);
  protected readonly removeTarget = signal<CartItem | null>(null);

  private readonly filter = signal('');
  protected readonly categories = computed(() => cartCategories(this.items()));
  // Falls back to "All" once the last item of the filtered category is removed.
  protected readonly activeFilter = computed(() => {
    const filter = this.filter();
    return this.categories().some((c) => c.slug === filter) ? filter : '';
  });
  protected readonly visibleItems = computed(() => {
    const filter = this.activeFilter();
    return filter ? this.items().filter((i) => categoryOf(i).slug === filter) : this.items();
  });
  protected readonly visibleSelected = computed(() => this.visibleItems().filter((i) => i.selected).length);
  protected readonly allSelected = computed(
    () => this.visibleItems().length > 0 && this.visibleSelected() === this.visibleItems().length,
  );
  protected readonly someSelected = computed(() => this.visibleSelected() > 0 && !this.allSelected());
  // Filtering only hides items -- ticked ones in other categories still go to checkout.
  protected readonly hiddenSelected = computed(() => this.selectedItems().length - this.visibleSelected());

  protected readonly categoryOf = categoryOf;

  setFilter(slug: string): void {
    this.filter.set(slug);
  }

  toggleAllVisible(): void {
    this.cart.setSelected(
      this.visibleItems().map((i) => i.productId),
      !this.allSelected(),
    );
  }

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

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideHouse, LucideLayoutGrid, LucideShoppingCart, LucideUser, LucideWrench } from '@lucide/angular';

import { CartService } from '../../core/cart.service';

const TABS = [
  { to: '/', label: 'Home', icon: 'house', exact: true },
  { to: '/products', label: 'Products', icon: 'grid', exact: false },
  { to: '/services', label: 'Services', icon: 'wrench', exact: false },
  { to: '/cart', label: 'Cart', icon: 'cart', exact: false },
  { to: '/account', label: 'Account', icon: 'user', exact: false },
] as const;

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, LucideHouse, LucideLayoutGrid, LucideWrench, LucideShoppingCart, LucideUser],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.css',
})
export class BottomNav {
  private cart = inject(CartService);

  protected readonly tabs = TABS;
  protected readonly cartCount = this.cart.count;
}

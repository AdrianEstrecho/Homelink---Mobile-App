import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { LucideArrowLeft, LucideHouse } from '@lucide/angular';

import { isTabRoot } from '../../core/shell-route.util';

const TAB_TITLES: Record<string, string> = {
  '/': 'HomeLink',
  '/products': 'Products',
  '/services': 'Services',
  '/cart': 'Cart',
  '/account': 'Account',
};

const SECTION_TITLES: { test: (url: string) => boolean; title: string }[] = [
  { test: (u) => u.startsWith('/account/profile'), title: 'Profile Details' },
  { test: (u) => u.startsWith('/account/address'), title: 'Address' },
  { test: (u) => u.startsWith('/account/payment'), title: 'Payment' },
  { test: (u) => u.startsWith('/account/notifications'), title: 'Notifications' },
  { test: (u) => u.startsWith('/account/security'), title: 'Security' },
  { test: (u) => u.startsWith('/account/reviews'), title: 'Reviews' },
  { test: (u) => u.startsWith('/account/support'), title: 'Support' },
  { test: (u) => u.startsWith('/products/'), title: 'Product Details' },
  { test: (u) => u.startsWith('/services/'), title: 'Book Service' },
  { test: (u) => u.startsWith('/gallery'), title: 'Gallery' },
  { test: (u) => u.startsWith('/location'), title: 'Our Location' },
  { test: (u) => u.startsWith('/policies'), title: 'Policies' },
  { test: (u) => u.startsWith('/wishlist'), title: 'Wishlist' },
  { test: (u) => u.startsWith('/checkout'), title: 'Checkout' },
  { test: (u) => u.startsWith('/orders'), title: 'My Orders' },
  { test: (u) => u.startsWith('/bookings'), title: 'My Bookings' },
  { test: (u) => u.startsWith('/terms'), title: 'Terms & Conditions' },
];

/**
 * Compact Android top app bar: the HomeLink wordmark on Home, a plain title
 * on the other bottom-nav tab roots, and a back arrow + section title on
 * every drill-down screen (product detail, checkout, orders, ...).
 */
@Component({
  selector: 'app-navbar',
  imports: [LucideArrowLeft, LucideHouse],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  protected readonly isHome = computed(() => this.url() === '/');
  protected readonly isTabRoot = computed(() => isTabRoot(this.url()));
  protected readonly pageTitle = computed(
    () => TAB_TITLES[this.url()] ?? SECTION_TITLES.find((t) => t.test(this.url()))?.title ?? 'HomeLink',
  );

  goBack(): void {
    window.history.back();
  }
}

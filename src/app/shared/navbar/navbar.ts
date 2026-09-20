import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { LucideArrowLeft, LucideHouse, LucideLogIn, LucideMenu, LucideShoppingCart } from '@lucide/angular';

import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { SideMenuService } from '../../core/side-menu.service';
import { isRootRoute } from '../../core/shell-route.util';

const ROOT_TITLES: Record<string, string> = {
  '/': 'HomeLink',
  '/products': 'Products',
  '/services': 'Services',
  '/gallery': 'Gallery',
  '/cart': 'Cart',
  '/wishlist': 'Wishlist',
  '/orders': 'My Orders',
  '/bookings': 'My Bookings',
  '/account': 'Account',
  '/about': 'About HomeLink',
  '/location': 'Our Location',
  '/policies': 'Policies',
  '/terms': 'Terms & Conditions',
};

const SECTION_TITLES: { test: (url: string) => boolean; title: string }[] = [
  { test: (u) => u.startsWith('/account/profile'), title: 'Profile Details' },
  { test: (u) => u.startsWith('/account/address'), title: 'Address' },
  { test: (u) => u.startsWith('/account/payment'), title: 'Payment' },
  { test: (u) => u.startsWith('/account/notifications'), title: 'Notifications' },
  { test: (u) => u.startsWith('/account/security'), title: 'Security' },
  { test: (u) => u.startsWith('/account/reviews'), title: 'Reviews' },
  { test: (u) => u.startsWith('/account/support'), title: 'Support' },
  { test: (u) => u.startsWith('/about/history'), title: 'Company History' },
  { test: (u) => u.startsWith('/about/services'), title: 'About Our Services' },
  { test: (u) => u.startsWith('/about/app'), title: 'About the App' },
  { test: (u) => u.startsWith('/about/developers'), title: 'The Developers' },
  { test: (u) => u.startsWith('/products/'), title: 'Product Details' },
  { test: (u) => u.startsWith('/services/') && u.endsWith('/book'), title: 'Book Service' },
  { test: (u) => u.startsWith('/services/'), title: 'Service Details' },
  { test: (u) => u.startsWith('/checkout'), title: 'Checkout' },
];

/**
 * Compact Android top app bar: a hamburger that opens the side menu on every
 * top-level destination, a back arrow + section title on drill-down screens
 * (product detail, checkout, account sub-pages, ...), and a cart button with
 * a live badge on the right.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, LucideArrowLeft, LucideHouse, LucideLogIn, LucideMenu, LucideShoppingCart],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private router = inject(Router);
  private cart = inject(CartService);
  private sideMenu = inject(SideMenuService);
  protected auth = inject(AuthService);

  protected readonly cartCount = this.cart.count;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  protected readonly isHome = computed(() => this.url() === '/');
  protected readonly isRoot = computed(() => isRootRoute(this.url()));
  protected readonly pageTitle = computed(
    () => ROOT_TITLES[this.url()] ?? SECTION_TITLES.find((t) => t.test(this.url()))?.title ?? 'HomeLink',
  );

  /** Home's own storefront header already carries a cart button — see Hero. */
  protected readonly showCart = computed(() => !this.isHome() && this.url() !== '/cart');

  openMenu(): void {
    this.sideMenu.open();
  }

  goBack(): void {
    window.history.back();
  }
}

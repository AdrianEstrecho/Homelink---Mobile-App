import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  LucideCalendar,
  LucideChevronRight,
  LucideCode,
  LucideFileText,
  LucideHeart,
  LucideHouse,
  LucideImage,
  LucideInfo,
  LucideLayoutGrid,
  LucideLifeBuoy,
  LucideLogIn,
  LucideLogOut,
  LucideMapPin,
  LucideMilestone,
  LucidePackage,
  LucideScrollText,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideSmartphone,
  LucideSparkles,
  LucideUserPlus,
  LucideWrench,
  LucideX,
} from '@lucide/angular';

import { APP_VERSION } from '../../core/app-info';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { SideMenuService } from '../../core/side-menu.service';
import { WishlistService } from '../../core/wishlist.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

type MenuIcon =
  | 'house'
  | 'grid'
  | 'wrench'
  | 'image'
  | 'cart'
  | 'heart'
  | 'package'
  | 'calendar'
  | 'support'
  | 'info'
  | 'history'
  | 'sparkles'
  | 'app'
  | 'code'
  | 'location'
  | 'policies'
  | 'terms';

interface MenuItem {
  to: string;
  label: string;
  icon: MenuIcon;
  exact?: boolean;
  /** Live counter rendered as a pill on the right of the row. */
  badge?: 'cart' | 'wishlist';
}

interface MenuSection {
  title: string;
  /** Sections gated on a signed-in customer are hidden entirely for guests. */
  authOnly?: boolean;
  items: MenuItem[];
}

const SECTIONS: MenuSection[] = [
  {
    title: 'Browse',
    items: [
      { to: '/', label: 'Home', icon: 'house', exact: true },
      { to: '/products', label: 'Products', icon: 'grid' },
      { to: '/services', label: 'Services', icon: 'wrench' },
      { to: '/gallery', label: 'Project Gallery', icon: 'image' },
    ],
  },
  {
    title: 'My HomeLink',
    authOnly: true,
    items: [
      { to: '/cart', label: 'My Cart', icon: 'cart', badge: 'cart' },
      { to: '/wishlist', label: 'Wishlist', icon: 'heart', badge: 'wishlist' },
      { to: '/orders', label: 'My Orders', icon: 'package' },
      { to: '/bookings', label: 'My Bookings', icon: 'calendar' },
      // No "Account Settings" row: the identity card at the top of the drawer
      // is the way into the account, and it lands on the profile page, which
      // carries the links to addresses/payment/notifications/security.
      { to: '/account/support', label: 'Help & Support', icon: 'support' },
    ],
  },
  {
    title: 'Discover HomeLink',
    items: [
      { to: '/about', label: 'About HomeLink', icon: 'info', exact: true },
      { to: '/about/history', label: 'Company History', icon: 'history' },
      { to: '/about/services', label: 'About Our Services', icon: 'sparkles' },
      { to: '/about/app', label: 'About the App', icon: 'app' },
      { to: '/about/developers', label: 'The Developers', icon: 'code' },
    ],
  },
  {
    title: 'More',
    items: [
      { to: '/location', label: 'Our Location', icon: 'location' },
      { to: '/policies', label: 'Policies', icon: 'policies' },
      { to: '/terms', label: 'Terms & Conditions', icon: 'terms' },
    ],
  },
];

const AVATAR_COLORS = ['bg-brand-blue', 'bg-brand-teal', 'bg-[#00806f]', 'bg-[#c8461a]'];

/** Matches the Account page's avatar colouring so one user reads the same everywhere. */
function avatarColor(seed: string): string {
  const sum = [...(seed || 'H')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/** How long the exit animation runs — keep in sync with .drawer-out in side-menu.css. */
const EXIT_MS = 230;

/**
 * The app's primary navigation: a full-height drawer covering every
 * destination, opened by the topbar hamburger (Navbar) and rendered once by
 * the app shell. It replaced the five-tab bottom bar so the whole map of the
 * app — storefront, the customer's own orders/bookings, the company pages and
 * the legal pages — is reachable from one place, which five tab slots could
 * never hold.
 */
@Component({
  selector: 'app-side-menu',
  imports: [
    RouterLink,
    RouterLinkActive,
    ConfirmDialog,
    LucideX,
    LucideHouse,
    LucideLayoutGrid,
    LucideWrench,
    LucideImage,
    LucideShoppingCart,
    LucideHeart,
    LucidePackage,
    LucideCalendar,
    LucideLifeBuoy,
    LucideInfo,
    LucideMilestone,
    LucideSparkles,
    LucideSmartphone,
    LucideCode,
    LucideMapPin,
    LucideFileText,
    LucideScrollText,
    LucideChevronRight,
    LucideShieldCheck,
    LucideLogOut,
    LucideLogIn,
    LucideUserPlus,
  ],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.css',
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class SideMenu {
  protected readonly menu = inject(SideMenuService);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private wishlist = inject(WishlistService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly sections = SECTIONS;
  protected readonly version = APP_VERSION;

  protected readonly user = this.auth.user;
  protected readonly cartCount = this.cart.count;
  protected readonly wishlistCount = this.wishlist.count;

  /** True while the exit animation plays, before the drawer leaves the DOM. */
  protected readonly closing = signal(false);
  protected readonly confirmLogout = signal(false);

  private exitTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // A tap on a row that navigates elsewhere is closed by the row's own
    // (click); this catches everything else that moves the URL while the
    // drawer is up (hardware back button, a redirect from a guard).
    const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.close());

    // The drawer covers the viewport, so the page behind it must not scroll
    // under the user's finger while it's open.
    effect(() => {
      document.body.style.overflow = this.menu.isOpen() ? 'hidden' : '';
    });

    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
      clearTimeout(this.exitTimer);
      document.body.style.overflow = '';
    });
  }

  close(): void {
    if (!this.menu.isOpen() || this.closing()) return;
    this.closing.set(true);
    this.exitTimer = setTimeout(() => {
      this.closing.set(false);
      this.menu.close();
    }, EXIT_MS);
  }

  protected sectionVisible(section: MenuSection): boolean {
    return !section.authOnly || !!this.user();
  }

  protected badgeCount(item: MenuItem): number {
    if (item.badge === 'cart') return this.cartCount();
    if (item.badge === 'wishlist') return this.wishlistCount();
    return 0;
  }

  protected avatarColor(): string {
    return avatarColor(this.user()?.id ?? this.user()?.email ?? '');
  }

  protected initials(): string {
    const u = this.user();
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || 'H';
  }

  protected memberSince(): string {
    const created = this.user()?.createdAt;
    return created ? new Date(created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
  }

  async handleLogout(): Promise<void> {
    this.confirmLogout.set(false);
    this.menu.close();
    await this.auth.logout();
    window.location.href = '/';
  }
}

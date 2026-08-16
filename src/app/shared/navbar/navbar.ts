import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideHouse, LucideMenu, LucideUser, LucideX } from '@lucide/angular';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/policies', label: 'Policies' },
  { to: '/location', label: 'Location' },
];

/**
 * Static chrome only for now (Phase 0) — no auth/cart/wishlist awareness yet,
 * and always the solid navy bar (the scroll-into-transparent-hero treatment
 * from frontend/src/components/Navbar.jsx comes back once Home's hero ships
 * in Phase 3). Login state, cart/wishlist badges, and the dashboard/logout
 * controls land once AuthService (Phase 2) and CartService/WishlistService
 * (Phase 4) exist.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideHouse, LucideMenu, LucideX, LucideUser],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly navLinks = NAV_LINKS;
  protected readonly mobileOpen = signal(false);

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}

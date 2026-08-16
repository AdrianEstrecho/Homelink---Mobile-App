import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideHouse, LucideLayoutDashboard, LucideLogOut, LucideMenu, LucideUser, LucideX } from '@lucide/angular';

import { AuthService } from '../../core/auth.service';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/policies', label: 'Policies' },
  { to: '/location', label: 'Location' },
];

/**
 * Ported from frontend/src/components/Navbar.jsx, minus the cart/wishlist
 * badges (land in Phase 4) and the scroll-into-transparent-hero treatment
 * (lands with Home's hero in Phase 3). Every user here is a customer — staff
 * accounts are rejected at login — so there's no admin-shortcut branch.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideHouse, LucideMenu, LucideX, LucideUser, LucideLayoutDashboard, LucideLogOut],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly navLinks = NAV_LINKS;
  protected readonly mobileOpen = signal(false);
  protected readonly user = this.auth.user;

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.closeMobile();
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}

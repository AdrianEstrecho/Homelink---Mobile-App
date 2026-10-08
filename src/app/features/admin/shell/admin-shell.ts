import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideCalendar,
  LucideLayoutDashboard,
  LucideLifeBuoy,
  LucideLogOut,
  LucideMenu,
  LucidePackage,
  LucidePackageCheck,
  LucideShoppingCart,
  LucideTicket,
  LucideUsers,
  LucideWrench,
  LucideX,
} from '@lucide/angular';
import { filter, map } from 'rxjs/operators';

import { AuthService } from '../../../core/auth.service';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { LogoMark } from '../../../shared/logo-mark/logo-mark';

type NavIcon = 'dashboard' | 'package' | 'wrench' | 'cart' | 'returns' | 'calendar' | 'users' | 'ticket' | 'support';

// Same order as the web sidebar's "Main" section (AdminLayout.jsx NAV_SECTIONS).
const NAV_ITEMS: { to: string; label: string; icon: NavIcon; exact: boolean }[] = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
  { to: '/admin/products', label: 'Products', icon: 'package', exact: false },
  { to: '/admin/services', label: 'Services', icon: 'wrench', exact: false },
  { to: '/admin/orders', label: 'Orders', icon: 'cart', exact: false },
  { to: '/admin/returns', label: 'Returns & Cancellations', icon: 'returns', exact: false },
  { to: '/admin/bookings', label: 'Bookings', icon: 'calendar', exact: false },
  { to: '/admin/users', label: 'Users', icon: 'users', exact: false },
  { to: '/admin/vouchers', label: 'Vouchers', icon: 'ticket', exact: false },
  { to: '/admin/support', label: 'Support', icon: 'support', exact: false },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/services': 'Services',
  '/admin/orders': 'Orders',
  '/admin/returns': 'Returns & Cancellations',
  '/admin/bookings': 'Bookings',
  '/admin/users': 'Users',
  '/admin/vouchers': 'Vouchers',
  '/admin/support': 'Support Messages',
};

const AVATAR_COLORS = ['bg-brand-navy', 'bg-brand-blue', 'bg-[#00806f]', 'bg-[#c8461a]'];

function avatarColor(seed: string): string {
  const sum = [...(seed || 'A')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * Mobile analog of frontend/src/components/AdminLayout.jsx: same navy sidebar
 * language, but a collapsible slide-out drawer (toggled by a hamburger button
 * in the topbar) instead of an always-visible desktop rail — there's no room
 * for a permanent 240px sidebar on a phone screen. Admin-only: it carries the
 * web sidebar's "Main" section (operations) but not its Management/System
 * sections, nor the position-scoped employee navs of NAV_SECTIONS.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [
    LogoMark,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConfirmDialog,
    LucideMenu,
    LucideX,
    LucideLayoutDashboard,
    LucidePackage,
    LucideWrench,
    LucideShoppingCart,
    LucidePackageCheck,
    LucideCalendar,
    LucideUsers,
    LucideTicket,
    LucideLifeBuoy,
    LucideLogOut,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css',
})
export class AdminShell {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly navItems = NAV_ITEMS;
  protected readonly navOpen = signal(false);
  protected readonly confirmLogout = signal(false);
  protected readonly user = this.auth.user;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  protected readonly pageTitle = computed(() => PAGE_TITLES[this.url()] ?? 'Admin');

  protected avatar(): string | null {
    return this.user()?.avatar ?? null;
  }

  protected avatarColor(): string {
    return avatarColor(this.user()?.id ?? 'A');
  }

  protected initials(): string {
    const u = this.user();
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || 'A';
  }

  toggleNav(): void {
    this.navOpen.update((v) => !v);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }

  async logout(): Promise<void> {
    this.confirmLogout.set(false);
    this.closeNav();
    await this.auth.logout();
    this.router.navigateByUrl('/admin/login');
  }
}

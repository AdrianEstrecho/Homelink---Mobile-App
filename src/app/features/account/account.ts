import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideCalendar,
  LucideChevronRight,
  LucideClock,
  LucideCreditCard,
  LucideFileText,
  LucideHeart,
  LucideImage,
  LucideLifeBuoy,
  LucideLock,
  LucideLogOut,
  LucideMail,
  LucideMapPin,
  LucideMapPinned,
  LucidePackage,
  LucidePhone,
  LucideShieldCheck,
  LucideStar,
  LucideUser,
} from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { CountUp } from '../../shared/count-up/count-up';
import { RevealDirective } from '../../shared/reveal.directive';

const AVATAR_COLORS = ['bg-brand-navy', 'bg-brand-blue', 'bg-[#00806f]', 'bg-[#c8461a]'];

function avatarColor(seed: string): string {
  const sum = [...(seed || 'H')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'H';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Ported from frontend/src/pages/Account.jsx. Admin/employee portal
 * shortcuts and position-scoped nav are dropped — every user here is a
 * customer (staff accounts are rejected at login).
 */
@Component({
  selector: 'app-account',
  imports: [
    RouterLink,
    RevealDirective,
    CountUp,
    ConfirmDialog,
    LucideShieldCheck,
    LucidePackage,
    LucideCalendar,
    LucideClock,
    LucideUser,
    LucideMapPinned,
    LucideCreditCard,
    LucideBell,
    LucideLock,
    LucideStar,
    LucideLifeBuoy,
    LucideLogOut,
    LucideChevronRight,
    LucideHeart,
    LucideImage,
    LucideMapPin,
    LucideFileText,
    LucidePhone,
    LucideMail,
  ],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  protected readonly user = this.auth.user;

  protected readonly ordersCount = signal<number | null>(null);
  protected readonly bookingsCount = signal<number | null>(null);

  protected readonly confirmLogout = signal(false);
  protected readonly loggingOut = signal(false);

  protected readonly memberSince = computed(() => {
    const created = this.user()?.createdAt;
    return created ? new Date(created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
  });

  protected readonly avatarColor = computed(() => avatarColor(this.user()?.id ?? this.user()?.email ?? ''));
  protected readonly initials = computed(() => initials(this.user()?.firstName, this.user()?.lastName));
  protected readonly greeting = greeting();

  constructor() {
    this.api
      .get<unknown[]>('/orders/my')
      .then((d) => this.ordersCount.set(d.length))
      .catch(() => this.ordersCount.set(0));
    this.api
      .get<unknown[]>('/bookings/my')
      .then((d) => this.bookingsCount.set(d.length))
      .catch(() => this.bookingsCount.set(0));
  }

  handleLogout(): void {
    this.confirmLogout.set(false);
    this.loggingOut.set(true);
    setTimeout(async () => {
      await this.auth.logout();
      window.location.href = '/';
    }, 600);
  }
}

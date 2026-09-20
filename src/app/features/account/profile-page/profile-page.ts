import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideCalendar,
  LucideChevronRight,
  LucideCircleCheck,
  LucideCreditCard,
  LucideLock,
  LucideMapPinned,
  LucidePackage,
  LucideShieldCheck,
  LucideSparkles,
  LucideStar,
} from '@lucide/angular';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { User } from '../../../core/user.model';
import { CountUp } from '../../../shared/count-up/count-up';
import { RevealDirective } from '../../../shared/reveal.directive';
import { ProfileTab } from '../tabs/profile-tab/profile-tab';

const AVATAR_GRADIENTS = [
  'from-brand-blue to-brand-navy',
  'from-[#22c2ad] to-[#00806f]',
  'from-[#ff8354] to-[#e25020]',
  'from-[#6c8ae4] to-[#2f4d9e]',
];

function avatarGradient(seed: string): string {
  const sum = [...(seed || 'H')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[sum % AVATAR_GRADIENTS.length];
}

/** The pieces of a profile that make checkout and booking work without extra typing. */
interface Requirement {
  key: string;
  label: string;
  /** Where the user goes to supply it, when it isn't on this page's own form. */
  to?: string;
  done: (u: User | null) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { key: 'name', label: 'Your name', done: (u) => !!u?.firstName?.trim() && !!u?.lastName?.trim() },
  { key: 'email', label: 'Email address', done: (u) => !!u?.email?.trim() },
  { key: 'phone', label: 'Mobile number', done: (u) => !!u?.phone?.trim() },
  { key: 'address', label: 'Default address', done: (u) => !!u?.address?.trim() },
  { key: 'alerts', label: 'Notification preferences', to: '/account/notifications', done: (u) => !!u && (u.notifyOrders || u.notifyBookings || u.notifyPromotions) },
];

interface QuickLink {
  to: string;
  label: string;
  icon: 'address' | 'payment' | 'bell' | 'lock' | 'star';
  accent: string;
}

const QUICK_LINKS: QuickLink[] = [
  { to: '/account/address', label: 'Addresses', icon: 'address', accent: 'bg-brand-teal/10 text-brand-teal' },
  { to: '/account/payment', label: 'Payment', icon: 'payment', accent: 'bg-brand-orange/10 text-brand-orange' },
  { to: '/account/notifications', label: 'Notifications', icon: 'bell', accent: 'bg-brand-blue/10 text-brand-blue' },
  { to: '/account/security', label: 'Security', icon: 'lock', accent: 'bg-brand-navy/10 text-brand-navy' },
  { to: '/account/reviews', label: 'My Reviews', icon: 'star', accent: 'bg-amber-100 text-amber-600' },
];

/**
 * The customer's identity screen: who the account says you are, how complete
 * that picture is, and the editor for the parts of it you control. The
 * completeness meter is not decoration — an empty phone or address is exactly
 * what stalls a checkout or leaves a technician unable to call ahead, so each
 * missing item links straight to where it gets filled in.
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    RouterLink,
    ProfileTab,
    RevealDirective,
    CountUp,
    LucideShieldCheck,
    LucideCircleCheck,
    LucideSparkles,
    LucideChevronRight,
    LucidePackage,
    LucideCalendar,
    LucideStar,
    LucideMapPinned,
    LucideCreditCard,
    LucideBell,
    LucideLock,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  protected readonly user = this.auth.user;
  protected readonly quickLinks = QUICK_LINKS;

  protected readonly ordersCount = signal<number | null>(null);
  protected readonly bookingsCount = signal<number | null>(null);
  protected readonly reviewsCount = signal<number | null>(null);

  protected readonly requirements = computed(() =>
    REQUIREMENTS.map((r) => ({ key: r.key, label: r.label, to: r.to, done: r.done(this.user()) })),
  );

  protected readonly completedCount = computed(() => this.requirements().filter((r) => r.done).length);

  protected readonly completeness = computed(() =>
    Math.round((this.completedCount() / this.requirements().length) * 100),
  );

  protected readonly missing = computed(() => this.requirements().filter((r) => !r.done));

  protected readonly completeMessage = computed(() => {
    const pct = this.completeness();
    if (pct === 100) return 'Everything we need is on file — checkout and booking will be a couple of taps.';
    if (pct >= 60) return 'Almost there. Finish these and checkout stops asking you for them.';
    return 'Filling these in now saves you typing at every checkout and booking.';
  });

  protected readonly initials = computed(() => {
    const u = this.user();
    return `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || 'H';
  });

  protected readonly avatarGradient = computed(() => avatarGradient(this.user()?.id ?? this.user()?.email ?? ''));

  protected readonly memberSince = computed(() => {
    const created = this.user()?.createdAt;
    return created ? new Date(created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';
  });

  constructor() {
    this.count('/orders/my', this.ordersCount);
    this.count('/bookings/my', this.bookingsCount);
    this.count('/reviews/my', this.reviewsCount);
  }

  private count(path: string, target: WritableSignal<number | null>): void {
    this.api
      .get<unknown[]>(path)
      .then((d) => target.set(d.length))
      .catch(() => target.set(0));
  }
}

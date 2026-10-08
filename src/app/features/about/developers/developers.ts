import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideArrowUpRight,
  LucideBot,
  LucideCheck,
  LucideLayoutDashboard,
  LucideMail,
  LucideServer,
  LucideShoppingBag,
  LucideSmartphone,
  LucideUsers,
  LucideWrench,
  LucideX,
} from '@lucide/angular';

import { TEAM, TeamMember, fullNameOf } from '../about.data';
import { DeliveryLane } from '../../../shared/delivery-lane/delivery-lane';
import { LogoMark } from '../../../shared/logo-mark/logo-mark';
import { RevealDirective } from '../../../shared/reveal.directive';
import { SafeImage } from '../../../shared/safe-image/safe-image';

type BuiltIcon = 'bag' | 'wrench' | 'phone' | 'dashboard' | 'server' | 'bot';

// What the team shipped, pointing at the real thing wherever there's a page for it.
const BUILT: { icon: BuiltIcon; title: string; desc: string; to?: string; cta?: string }[] = [
  { icon: 'bag', title: 'Storefront', desc: 'Browse and buy home-improvement products, from air conditioners and solar panels to CCTV and smart home devices.', to: '/products', cta: 'Shop products' },
  { icon: 'wrench', title: 'Service booking', desc: 'Book verified technicians for installation, maintenance, and repairs, then track the job from schedule to completion.', to: '/services', cta: 'Book a service' },
  { icon: 'phone', title: 'Mobile app', desc: 'This companion app, built with Angular and Capacitor, packaged for Android and deployed for the web.', to: '/about/app', cta: 'About the app' },
  { icon: 'dashboard', title: 'Staff portal', desc: 'Role-based dashboards for administrators, inventory clerks, booking coordinators, HR, and installers.' },
  { icon: 'server', title: 'API & database', desc: 'A Node.js and Express API on PostgreSQL, with PayMongo payments, Resend email, and Google sign-in.' },
  { icon: 'bot', title: 'AI assistant', desc: 'A Gemini-powered shopping assistant that recommends products and services for a customer’s budget.' },
];

const STACK = ['React', 'Vite', 'Tailwind CSS', 'Node.js', 'Express', 'PostgreSQL', 'Supabase', 'Angular', 'Capacitor', 'PayMongo', 'Resend', 'Google Maps', 'Gemini'];

/** Barcode bars made from the slug, so every badge has its own code and it never changes. */
function barcodeFor(slug: string) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of slug.replace(/-/g, '')) {
    const code = ch.charCodeAt(0);
    const w = 1 + (code % 3);
    bars.push({ x, w });
    x += w + 1 + ((code >> 2) % 2);
  }
  return { bars, width: x };
}

/**
 * Ported from the web's Team page (frontend/src/pages/Team.jsx): the HomeLink delivery truck
 * driving under the header, the developers as staff ID badges on lanyards, and each member's
 * profile in a sheet you can step through. The open profile lives in the URL
 * (?member=<slug>), so a teammate's profile can be linked to directly. The roster is TEAM in
 * about.data.ts.
 */
@Component({
  selector: 'app-developers',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RevealDirective,
    DeliveryLane,
    LogoMark,
    SafeImage,
    LucideUsers,
    LucideArrowRight,
    LucideArrowLeft,
    LucideArrowUpRight,
    LucideShoppingBag,
    LucideWrench,
    LucideSmartphone,
    LucideLayoutDashboard,
    LucideServer,
    LucideBot,
    LucideCheck,
    LucideMail,
    LucideX,
  ],
  templateUrl: './developers.html',
  styleUrl: './developers.css',
})
export class Developers {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly team = TEAM;
  protected readonly built = BUILT;
  protected readonly stack = STACK;
  protected readonly badges = TEAM.map((m, i) => ({ member: m, number: String(i + 1).padStart(2, '0'), code: barcodeFor(m.slug) }));
  protected readonly fullNameOf = fullNameOf;

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly active = computed(() => TEAM.find((m) => m.slug === this.query().get('member')) ?? null);
  protected readonly position = computed(() => {
    const m = this.active();
    if (!m) return null;
    const at = TEAM.indexOf(m);
    return {
      at,
      prev: TEAM[(at - 1 + TEAM.length) % TEAM.length],
      next: TEAM[(at + 1) % TEAM.length],
    };
  });

  // Replaced rather than pushed, so stepping through profiles doesn't leave a trail of history
  // entries for Back to wade through.
  openMember(slug: string): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { member: slug }, replaceUrl: true });
  }

  closeMember(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  /** The badge gives a springy swing on its lanyard, then the profile opens. */
  tapBadge(event: Event, member: TeamMember): void {
    const hanger = (event.currentTarget as HTMLElement).closest<HTMLElement>('.badge-hanger');
    if (hanger && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      hanger.style.setProperty('--swing', '6deg');
      setTimeout(() => hanger.style.setProperty('--swing', '0deg'), 120);
    }
    setTimeout(() => this.openMember(member.slug), 160);
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }
}

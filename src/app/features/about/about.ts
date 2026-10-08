import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendarClock,
  LucideCheck,
  LucideChevronRight,
  LucideCreditCard,
  LucidePackage,
  LucidePackageCheck,
  LucideSearch,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideTriangleAlert,
  LucideX,
  LucideCode,
  LucideCompass,
  LucideGem,
  LucideHandshake,
  LucideHouse,
  LucideMilestone,
  LucideShield,
  LucideSmartphone,
  LucideSparkles,
  LucideStar,
  LucideTarget,
  LucideWrench,
} from '@lucide/angular';

import { ABOUT_STATS, ABOUT_VALUES, TEAM } from './about.data';
import { ApiService } from '../../core/api.service';
import { APP_TAGLINE } from '../../core/app-info';
import { CategoryIcon } from '../../shared/category-icon/category-icon';
import { CountUp } from '../../shared/count-up/count-up';
import { RevealDirective } from '../../shared/reveal.directive';
import { LogoMark } from '../../shared/logo-mark/logo-mark';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { SplitText } from '../../shared/split-text/split-text';

// What circles the mark in the orbit; each one opens that category on Products.
const ORBIT = [
  { slug: 'air-conditioners', label: 'Air conditioning' },
  { slug: 'solar-panels', label: 'Solar' },
  { slug: 'cctv-security', label: 'CCTV & security' },
  { slug: 'plumbing', label: 'Plumbing' },
  { slug: 'electrical', label: 'Electrical' },
  { slug: 'smart-home', label: 'Smart home' },
];

type StepIcon = 'cart' | 'search' | 'calendar' | 'alert' | 'package' | 'shield' | 'card' | 'done';

// The story's before-and-after, told as the steps a homeowner goes through.
const OLD_WAY: { icon: StepIcon; text: string }[] = [
  { icon: 'cart', text: 'Buy the unit from one store' },
  { icon: 'search', text: 'Hunt for an installer somewhere else' },
  { icon: 'calendar', text: 'Line up delivery and installation yourself' },
  { icon: 'alert', text: 'Hope the two actually meet' },
];
const HOMELINK_WAY: { icon: StepIcon; text: string }[] = [
  { icon: 'package', text: 'Pick the product you need' },
  { icon: 'shield', text: 'Add a verified technician to install it' },
  { icon: 'card', text: 'Book both in a single checkout' },
  { icon: 'done', text: 'Track it from order to a finished job' },
];

// What an unconfigured store shows; Admin > CMS can change both (GET /promos/about-hero).
const DEFAULT_HERO = {
  heading: 'Home improvement, done right.',
  intro:
    'We bring home improvement products and the professionals who install them into one place — so you can shop, book and get the job done without juggling vendors.',
};

interface HubLink {
  to: string;
  label: string;
  desc: string;
  icon: 'history' | 'services' | 'app' | 'devs';
  accent: string;
}

const HUB_LINKS: HubLink[] = [
  {
    to: '/about/history',
    label: 'Company History',
    desc: 'How HomeLink went from a list of vendors to a marketplace.',
    icon: 'history',
    accent: 'bg-brand-navy/10 text-brand-navy',
  },
  {
    to: '/about/services',
    label: 'About Our Services',
    desc: 'What our technicians do, and how a booking actually works.',
    icon: 'services',
    accent: 'bg-brand-teal/10 text-brand-teal',
  },
  {
    to: '/about/app',
    label: 'About the App',
    desc: 'What this app can do, and what it is built on.',
    icon: 'app',
    accent: 'bg-brand-orange/10 text-brand-orange',
  },
  {
    to: '/about/developers',
    label: 'The Developers',
    desc: 'The people who designed and shipped HomeLink.',
    icon: 'devs',
    accent: 'bg-brand-blue/10 text-brand-blue',
  },
];

/**
 * The "Discover HomeLink" entry point: the pitch, the numbers, the values,
 * and the way in to the four detail pages. Mobile counterpart of
 * frontend/src/pages/About.jsx, split apart — the web page is one long scroll
 * because a desktop reader will keep scrolling; on a phone the same material
 * reads better as a hub with four short destinations.
 */
@Component({
  selector: 'app-about',
  imports: [
    LogoMark,
    RouterLink,
    RevealDirective,
    CountUp,
    CategoryIcon,
    SafeImage,
    SplitText,
    LucideCalendarClock,
    LucideCheck,
    LucideCreditCard,
    LucidePackage,
    LucidePackageCheck,
    LucideSearch,
    LucideShieldCheck,
    LucideShoppingCart,
    LucideTriangleAlert,
    LucideX,
    LucideHouse,
    LucideWrench,
    LucideArrowRight,
    LucideChevronRight,
    LucideMilestone,
    LucideSparkles,
    LucideSmartphone,
    LucideCode,
    LucideShield,
    LucideHandshake,
    LucideTarget,
    LucideStar,
    LucideGem,
    LucideCompass,
  ],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  private destroyRef = inject(DestroyRef);

  protected readonly stats = ABOUT_STATS;
  protected readonly values = ABOUT_VALUES;
  protected readonly hubLinks = HUB_LINKS;
  protected readonly tagline = APP_TAGLINE;
  protected readonly orbit = ORBIT;
  protected readonly oldWay = OLD_WAY;
  protected readonly homelinkWay = HOMELINK_WAY;
  protected readonly team = TEAM;
  protected readonly compareSides = [
    { value: false, label: 'The old way' },
    { value: true, label: 'With HomeLink' },
  ];

  protected readonly hero = signal(DEFAULT_HERO);
  protected readonly withHomeLink = signal(false);
  private touched = false;
  private readonly compare = viewChild.required<ElementRef<HTMLElement>>('compare');

  constructor() {
    inject(ApiService)
      .get<{ heading?: string; intro?: string }>('/promos/about-hero')
      .then((data) => this.hero.set({ heading: data.heading || DEFAULT_HERO.heading, intro: data.intro || DEFAULT_HERO.intro }))
      .catch(() => {});

    // Switches to "With HomeLink" on its own once the comparison has been on screen a moment.
    afterNextRender(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          timer = setTimeout(() => {
            if (!this.touched) this.withHomeLink.set(true);
          }, 2200);
        },
        { threshold: 0.4 },
      );
      io.observe(this.compare().nativeElement);
      this.destroyRef.onDestroy(() => {
        io.disconnect();
        clearTimeout(timer);
      });
    });
  }

  pickSide(value: boolean): void {
    this.touched = true;
    this.withHomeLink.set(value);
  }
}

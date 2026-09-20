import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideChevronRight,
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

import { ABOUT_STATS, ABOUT_VALUES } from './about.data';
import { APP_TAGLINE } from '../../core/app-info';
import { CountUp } from '../../shared/count-up/count-up';
import { RevealDirective } from '../../shared/reveal.directive';

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
    RouterLink,
    RevealDirective,
    CountUp,
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
  protected readonly stats = ABOUT_STATS;
  protected readonly values = ABOUT_VALUES;
  protected readonly hubLinks = HUB_LINKS;
  protected readonly tagline = APP_TAGLINE;
}

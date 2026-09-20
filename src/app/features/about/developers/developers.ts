import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCode,
  LucideDatabase,
  LucideGraduationCap,
  LucideLayers,
  LucideSmartphone,
  LucideSparkles,
} from '@lucide/angular';

import { DEVELOPERS, TEAM_NOTE } from '../about.data';
import { RevealDirective } from '../../../shared/reveal.directive';

const CARD_ACCENTS: Record<string, { avatar: string; chip: string }> = {
  orange: { avatar: 'from-[#ff8354] to-[#e25020]', chip: 'bg-brand-orange/10 text-brand-orange' },
  teal: { avatar: 'from-[#22c2ad] to-[#00806f]', chip: 'bg-brand-teal/10 text-brand-teal' },
  navy: { avatar: 'from-brand-blue to-brand-navy', chip: 'bg-brand-navy/10 text-brand-navy' },
  blue: { avatar: 'from-[#2f6fc2] to-[#1a4a8a]', chip: 'bg-brand-blue/10 text-brand-blue' },
};

/** What the team built, expressed as the four surfaces that had to ship. */
const BUILT: { icon: 'layers' | 'database' | 'smartphone' | 'sparkles'; label: string; desc: string }[] = [
  { icon: 'layers', label: 'Customer storefront', desc: 'Catalogue, cart, checkout and service booking on the web.' },
  { icon: 'database', label: 'API & database', desc: 'Express services, Postgres schema, payments and email.' },
  { icon: 'sparkles', label: 'Staff portal', desc: 'Admin dashboard for products, orders, bookings and users.' },
  { icon: 'smartphone', label: 'This Android app', desc: 'The whole marketplace rebuilt in Angular and Capacitor.' },
];

/**
 * Credits page. The roster lives in about.data.ts — one entry per contributor,
 * so adding a teammate is a data edit rather than a template edit.
 */
@Component({
  selector: 'app-developers',
  imports: [
    RouterLink,
    RevealDirective,
    LucideCode,
    LucideArrowRight,
    LucideGraduationCap,
    LucideLayers,
    LucideDatabase,
    LucideSmartphone,
    LucideSparkles,
  ],
  templateUrl: './developers.html',
  styleUrl: './developers.css',
})
export class Developers {
  protected readonly developers = DEVELOPERS;
  protected readonly teamNote = TEAM_NOTE;
  protected readonly built = BUILT;

  protected accent(key: string) {
    return CARD_ACCENTS[key] ?? CARD_ACCENTS['navy'];
  }
}

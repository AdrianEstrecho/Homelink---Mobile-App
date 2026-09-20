import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCctv,
  LucideClock,
  LucideDroplets,
  LucideGem,
  LucideShield,
  LucideSnowflake,
  LucideSparkles,
  LucideStar,
  LucideSun,
  LucideWrench,
  LucideZap,
} from '@lucide/angular';

import { BOOKING_STAGES, SERVICE_PILLARS, SERVICE_PROMISES, SERVICE_STEPS } from '../about.data';
import { RevealDirective } from '../../../shared/reveal.directive';

const PILLAR_ACCENTS: Record<string, string> = {
  orange: 'bg-brand-orange/10 text-brand-orange',
  teal: 'bg-brand-teal/10 text-brand-teal',
  navy: 'bg-brand-navy/10 text-brand-navy',
  blue: 'bg-brand-blue/10 text-brand-blue',
};

/** Maps a service category to the glyph that reads fastest for it. */
const PILLAR_ICONS: Record<string, string> = {
  'Air Conditioning': 'snowflake',
  'Solar Energy': 'sun',
  Security: 'cctv',
  Electrical: 'zap',
  Plumbing: 'droplets',
  General: 'wrench',
};

/**
 * What HomeLink's technicians actually do, and what booking one involves.
 * The categories and the booking stages here track the real catalogue
 * (backend/db/seed.js) and the real tracking states (tracking-modal.ts) —
 * see about.data.ts.
 */
@Component({
  selector: 'app-about-services',
  imports: [
    RouterLink,
    RevealDirective,
    LucideSparkles,
    LucideArrowRight,
    LucideShield,
    LucideClock,
    LucideStar,
    LucideGem,
    LucideSnowflake,
    LucideSun,
    LucideCctv,
    LucideZap,
    LucideDroplets,
    LucideWrench,
  ],
  templateUrl: './about-services.html',
  styleUrl: './about-services.css',
})
export class AboutServices {
  protected readonly pillars = SERVICE_PILLARS;
  protected readonly steps = SERVICE_STEPS;
  protected readonly stages = BOOKING_STAGES;
  protected readonly promises = SERVICE_PROMISES;

  protected accent(key: string): string {
    return PILLAR_ACCENTS[key] ?? PILLAR_ACCENTS['navy'];
  }

  protected icon(category: string): string {
    return PILLAR_ICONS[category] ?? 'wrench';
  }
}

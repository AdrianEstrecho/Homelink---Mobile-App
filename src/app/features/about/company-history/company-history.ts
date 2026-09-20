import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideFlag, LucideHouse, LucideQuote, LucideWrench } from '@lucide/angular';

import { ABOUT_STATS, MILESTONES } from '../about.data';
import { CountUp } from '../../../shared/count-up/count-up';
import { RevealDirective } from '../../../shared/reveal.directive';

const NODE_ACCENTS: Record<string, { dot: string; year: string }> = {
  navy: { dot: 'bg-brand-navy', year: 'text-brand-navy' },
  teal: { dot: 'bg-brand-teal', year: 'text-brand-teal' },
  orange: { dot: 'bg-brand-orange', year: 'text-brand-orange' },
};

/** The founding story, as a vertical timeline — the shape a phone reads best. */
@Component({
  selector: 'app-company-history',
  imports: [RouterLink, RevealDirective, CountUp, LucideHouse, LucideWrench, LucideQuote, LucideFlag, LucideArrowRight],
  templateUrl: './company-history.html',
  styleUrl: './company-history.css',
})
export class CompanyHistory {
  protected readonly milestones = MILESTONES;
  protected readonly stats = ABOUT_STATS;

  protected accent(key: string) {
    return NODE_ACCENTS[key] ?? NODE_ACCENTS['navy'];
  }
}

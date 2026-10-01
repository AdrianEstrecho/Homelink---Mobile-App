import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCircleQuestionMark, LucideLifeBuoy } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Faq } from '../../core/faq.model';
import { ErrorState } from '../../shared/error-state/error-state';
import { FaqAccordion } from '../../shared/faq-accordion/faq-accordion';
import { Skeleton } from '../../shared/skeleton/skeleton';

/** Ported from frontend/src/pages/FAQ.jsx — the full list behind Home's "Questions, answered". */
@Component({
  selector: 'app-faq',
  imports: [RouterLink, ErrorState, FaqAccordion, Skeleton, LucideCircleQuestionMark, LucideLifeBuoy],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class FaqPage {
  private api = inject(ApiService);

  protected readonly faqs = signal<Faq[] | null>(null);
  protected readonly error = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.faqs.set(null);
    this.error.set(false);
    this.api
      .get<Faq[]>('/faqs')
      .then((data) => this.faqs.set(data))
      .catch(() => this.error.set(true));
  }
}

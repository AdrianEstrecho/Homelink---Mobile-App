import { Component, input, signal } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

import { Faq } from '../../core/faq.model';

/**
 * One question open at a time, the first open by default — the accordion from
 * frontend/src/pages/FAQ.jsx and the "Questions, answered" block of Home.jsx. The open question
 * gets an orange accent bar and a filled chevron; its answer expands with a grid-rows transition.
 */
@Component({
  selector: 'app-faq-accordion',
  imports: [LucideChevronDown],
  templateUrl: './faq-accordion.html',
  styleUrl: './faq-accordion.css',
})
export class FaqAccordion {
  readonly faqs = input.required<Faq[]>();

  protected readonly open = signal<number | null>(0);

  toggle(index: number): void {
    this.open.update((current) => (current === index ? null : index));
  }
}

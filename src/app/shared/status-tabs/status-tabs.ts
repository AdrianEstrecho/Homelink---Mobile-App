import { Component, ElementRef, afterRenderEffect, input, output, viewChild } from '@angular/core';

import { FilterOption } from '../filter-drawer/filter-drawer';

/**
 * The underline status tabs across the top of My Orders and My Bookings. Scrolls sideways when
 * the tabs outrun the screen, and keeps the active one in view — a deep link or back navigation
 * can land on the last tab, well past the right edge.
 */
@Component({
  selector: 'app-status-tabs',
  templateUrl: './status-tabs.html',
  host: { class: 'block relative -mx-4' },
})
export class StatusTabs {
  readonly options = input.required<FilterOption[]>();
  readonly active = input.required<string>();
  readonly label = input('Filter by status');

  readonly selected = output<string>();

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  constructor() {
    afterRenderEffect(() => {
      const key = this.active();
      const el = this.scroller().nativeElement;
      const tab = el.querySelector<HTMLElement>(`[data-key="${key}"]`);
      if (!tab) return;
      const left = tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    });
  }
}

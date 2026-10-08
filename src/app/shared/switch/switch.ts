import { Component, input, output } from '@angular/core';

/**
 * Ported from frontend/src/components/Switch.jsx — the on/off toggle for settings rows.
 * `label` names it for screen readers when the visible text sits elsewhere in the row.
 */
@Component({
  selector: 'app-switch',
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label() || null"
      (click)="toggled.emit()"
      [disabled]="disabled()"
      class="tap relative shrink-0 w-11 h-6 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      [class]="checked() ? 'bg-brand-orange' : 'bg-gray-300'"
    >
      <span
        class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        [class]="checked() ? 'translate-x-5' : 'translate-x-0'"
      ></span>
    </button>
  `,
})
export class Switch {
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly label = input<string>();

  readonly toggled = output<void>();
}

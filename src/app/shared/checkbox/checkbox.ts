import { Component, input, output } from '@angular/core';
import { LucideCheck, LucideMinus } from '@lucide/angular';

/**
 * Ported from frontend/src/components/Checkbox.jsx — a rounded tick box in the brand orange.
 * The real <input> sits invisibly on top of the drawn box, so taps, keyboard focus, wrapping
 * <label>s and screen readers all work as they would with a native checkbox. It's controlled:
 * `changed` asks the parent to flip `checked`, and the box only changes once it does.
 */
@Component({
  selector: 'app-checkbox',
  imports: [LucideCheck, LucideMinus],
  host: { class: 'relative inline-flex shrink-0 w-5 h-5' },
  template: `
    <input
      type="checkbox"
      [checked]="checked()"
      [indeterminate]="indeterminate()"
      [attr.aria-label]="label() || null"
      (change)="onChange($event)"
      class="peer absolute inset-0 m-0 opacity-0 cursor-pointer"
    />
    <span
      aria-hidden="true"
      class="pointer-events-none w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange/40 peer-focus-visible:ring-offset-2 peer-active:scale-90"
      [class]="
        checked() || indeterminate()
          ? 'bg-brand-orange border-brand-orange shadow-sm shadow-brand-orange/30'
          : 'bg-white border-gray-300'
      "
    >
      @if (indeterminate()) {
        <svg lucideMinus class="w-3.5 h-3.5 text-white" [attr.stroke-width]="3"></svg>
      } @else {
        <svg
          lucideCheck
          class="w-3.5 h-3.5 text-white transition-transform duration-200"
          [class]="checked() ? 'scale-100' : 'scale-0'"
          [attr.stroke-width]="3"
        ></svg>
      }
    </span>
  `,
})
export class Checkbox {
  readonly checked = input(false);
  readonly indeterminate = input(false);
  /** Names it for screen readers when no visible label wraps it. */
  readonly label = input<string>();

  readonly changed = output<void>();

  onChange(event: Event): void {
    // Put the native box back to what the parent says; the parent's update redraws it.
    const box = event.target as HTMLInputElement;
    box.checked = this.checked();
    box.indeterminate = this.indeterminate();
    this.changed.emit();
  }
}

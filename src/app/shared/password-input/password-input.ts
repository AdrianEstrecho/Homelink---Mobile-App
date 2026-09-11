import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye, LucideEyeOff } from '@lucide/angular';

/**
 * A password `<input>` with a show/hide toggle. `value`/`valueChange` follow
 * Angular's input/output naming convention so callers can use the
 * `[(value)]="password"` two-way box syntax directly on a plain string
 * property, the same as `[(ngModel)]` would.
 */
@Component({
  selector: 'app-password-input',
  imports: [FormsModule, LucideEye, LucideEyeOff],
  templateUrl: './password-input.html',
  styleUrl: './password-input.css',
})
export class PasswordInput {
  readonly value = input('');
  readonly name = input.required<string>();
  readonly required = input(false);
  readonly autofocus = input(false);
  readonly wrapClass = input('', { alias: 'class' });

  readonly valueChange = output<string>();
  readonly focused = output<void>();

  protected readonly visible = signal(false);

  toggleVisible(): void {
    this.visible.update((v) => !v);
  }
}

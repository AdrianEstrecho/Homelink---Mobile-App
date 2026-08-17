import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideTriangleAlert } from '@lucide/angular';

/**
 * Ported from frontend/src/components/CancelReasonModal.jsx. React's
 * `onSubmit` is awaited inline by the modal itself; here `submitted` just
 * emits the reason and the parent calls the public `showError()` method
 * (via viewChild()) if the API call fails — same pattern as AddressPicker/
 * PaymentMethodPicker's validate().
 */
@Component({
  selector: 'app-cancel-reason-modal',
  imports: [FormsModule, LucideTriangleAlert],
  templateUrl: './cancel-reason-modal.html',
  styleUrl: './cancel-reason-modal.css',
})
export class CancelReasonModal {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input<string>();

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  protected readonly reason = signal('');
  protected readonly error = signal('');
  protected readonly submitting = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reason.set('');
        this.error.set('');
        this.submitting.set(false);
      }
    });
  }

  onReasonInput(value: string): void {
    this.reason.set(value);
    if (this.error()) this.error.set('');
  }

  submit(): void {
    const trimmed = this.reason().trim();
    if (!trimmed) {
      this.error.set('Please tell us why you’re cancelling.');
      return;
    }
    this.submitting.set(true);
    this.submitted.emit(trimmed);
  }

  cancel(): void {
    if (this.submitting()) return;
    this.cancelled.emit();
  }

  showError(msg: string): void {
    this.error.set(msg || 'Something went wrong. Please try again.');
    this.submitting.set(false);
  }
}

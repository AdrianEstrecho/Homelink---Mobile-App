import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';

import { ReturnKind } from '../../core/returns.util';

/**
 * Ported from frontend/src/components/RejectReturnDialog.jsx. Same shape as
 * CancelReasonModal: `submitted` emits the note and the parent calls the
 * public `showError()` (via viewChild()) if the API call fails. The note is
 * required — it's the only explanation the customer ever gets for a rejection.
 */
@Component({
  selector: 'app-reject-return-dialog',
  imports: [FormsModule, LucideX],
  templateUrl: './reject-return-dialog.html',
  styleUrl: './reject-return-dialog.css',
})
export class RejectReturnDialog {
  readonly open = input(false);
  readonly customer = input('');
  readonly kind = input<ReturnKind>('return');

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  // Refusing a return leaves the customer holding goods they still own; refusing a
  // cancellation refund leaves them out of pocket on an order that stays cancelled either way.
  protected readonly cancellation = computed(() => this.kind() === 'cancellation');

  protected readonly note = signal('');
  protected readonly error = signal('');
  protected readonly submitting = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.note.set('');
        this.error.set('');
        this.submitting.set(false);
      }
    });
  }

  onNoteInput(value: string): void {
    this.note.set(value);
    if (this.error()) this.error.set('');
  }

  submit(): void {
    const trimmed = this.note().trim();
    if (trimmed.length < 5) {
      this.error.set('Please give the customer a reason for the rejection.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
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

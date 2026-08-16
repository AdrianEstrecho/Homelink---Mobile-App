import { Component, input, output } from '@angular/core';

export type ConfirmTone = 'delete' | 'archive' | 'update' | 'login' | 'create';

interface ToneStyle {
  icon: string;
  confirm: string;
}

const TONE_STYLES: Record<ConfirmTone, ToneStyle> = {
  delete: { icon: 'bg-red-100 text-red-600', confirm: 'bg-red-600 hover:bg-red-700' },
  archive: { icon: 'bg-purple-100 text-purple-600', confirm: 'bg-purple-600 hover:bg-purple-700' },
  update: { icon: 'bg-amber-100 text-amber-600', confirm: 'bg-amber-600 hover:bg-amber-700' },
  login: { icon: 'bg-blue-100 text-blue-600', confirm: 'bg-blue-600 hover:bg-blue-700' },
  create: { icon: 'bg-green-100 text-green-600', confirm: 'bg-green-600 hover:bg-green-700' },
};

/**
 * Ported from frontend/src/components/ConfirmDialog.jsx. React passes the
 * icon as a component prop; here callers project it via the [icon] content
 * slot instead (see AuthIllustration for the same pattern).
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly tone = input<ConfirmTone>('delete');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected toneStyle(): ToneStyle {
    return TONE_STYLES[this.tone()] ?? TONE_STYLES.delete;
  }
}

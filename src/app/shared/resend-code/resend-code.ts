import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { LucideCheck } from '@lucide/angular';

/**
 * Ported from frontend/src/components/auth/ResendCode.jsx — "Resend code" with a cooldown
 * measured from when the last code went out (`sentAt`, ms), so a burst of taps can't fire a
 * burst of emails. `onResend` should reject on failure — the page shows the error itself.
 */
@Component({
  selector: 'app-resend-code',
  imports: [LucideCheck],
  templateUrl: './resend-code.html',
  styleUrl: './resend-code.css',
  // Block, so a parent's space-y-* margin applies to it (an inline host ignores vertical margin).
  host: { class: 'block' },
})
export class ResendCode {
  readonly sentAt = input.required<number>();
  readonly onResend = input.required<() => Promise<unknown>>();
  readonly cooldownSeconds = input(30);

  protected readonly now = signal(Date.now());
  protected readonly sending = signal(false);
  protected readonly resent = signal(false);

  /** Clamped because `now` can lag a freshly updated sentAt by up to a tick. */
  protected readonly remaining = computed(() =>
    Math.min(this.cooldownSeconds(), Math.max(0, Math.ceil((this.sentAt() + this.cooldownSeconds() * 1000 - this.now()) / 1000))),
  );

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  async resend(): Promise<void> {
    this.sending.set(true);
    this.resent.set(false);
    try {
      await this.onResend()();
      this.resent.set(true);
      this.now.set(Date.now());
    } catch {
      // Surfaced by the page's own error message.
    } finally {
      this.sending.set(false);
    }
  }
}

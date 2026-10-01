import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { LucideChevronDown, LucideFileText, LucideX } from '@lucide/angular';

import { termsSections } from '../../core/terms-content';

/** How close to the bottom counts as "read to the end". */
const BOTTOM_SLACK_PX = 24;

/**
 * Ported from frontend/src/components/TermsModal.jsx. With `requireAcceptance` (the signup
 * flow), the reader must scroll to the bottom before Accept unlocks, and Accept/Decline replace
 * the plain Close button. Without it, it's a read-only viewer.
 */
@Component({
  selector: 'app-terms-modal',
  imports: [LucideFileText, LucideX, LucideChevronDown],
  templateUrl: './terms-modal.html',
  styleUrl: './terms-modal.css',
})
export class TermsModal {
  readonly open = input(false);
  readonly requireAcceptance = input(false);
  readonly closed = output<void>();
  readonly accepted = output<void>();
  readonly declined = output<void>();

  protected readonly sections = termsSections;
  protected readonly scrolledToBottom = signal(false);
  private readonly scrollArea = viewChild<ElementRef<HTMLElement>>('scrollArea');

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) return;
      this.scrolledToBottom.set(false);
      if (!this.requireAcceptance()) return;
      // Content that already fits has nothing to scroll to — don't block Accept on a scrollbar
      // that will never appear.
      const raf = requestAnimationFrame(() => {
        const el = this.scrollArea()?.nativeElement;
        if (el && el.scrollHeight - el.clientHeight < BOTTOM_SLACK_PX) this.scrolledToBottom.set(true);
      });
      onCleanup(() => cancelAnimationFrame(raf));
    });
  }

  onScroll(event: Event): void {
    if (!this.requireAcceptance()) return;
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK_PX) this.scrolledToBottom.set(true);
  }

  close(): void {
    this.closed.emit();
  }

  decline(): void {
    this.declined.emit();
  }

  accept(): void {
    if (this.scrolledToBottom()) this.accepted.emit();
  }
}

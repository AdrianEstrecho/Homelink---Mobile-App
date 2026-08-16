import { Component, input, output } from '@angular/core';
import { LucideFileText, LucideX } from '@lucide/angular';

import { termsSections } from '../../core/terms-content';

@Component({
  selector: 'app-terms-modal',
  imports: [LucideFileText, LucideX],
  templateUrl: './terms-modal.html',
  styleUrl: './terms-modal.css',
})
export class TermsModal {
  readonly open = input(false);
  readonly closed = output<void>();
  protected readonly sections = termsSections;

  close(): void {
    this.closed.emit();
  }
}

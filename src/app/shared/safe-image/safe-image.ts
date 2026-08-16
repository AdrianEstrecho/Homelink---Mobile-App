import { Component, input, signal } from '@angular/core';
import { LucideImageOff } from '@lucide/angular';

@Component({
  selector: 'app-safe-image',
  imports: [LucideImageOff],
  templateUrl: './safe-image.html',
  styleUrl: './safe-image.css',
})
export class SafeImage {
  readonly src = input<string>();
  readonly alt = input('');
  readonly imgClass = input('', { alias: 'class' });
  readonly iconClass = input('w-8 h-8');

  protected readonly failed = signal(false);

  onError(): void {
    this.failed.set(true);
  }
}

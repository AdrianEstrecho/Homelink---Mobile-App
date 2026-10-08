import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { LucideImageOff } from '@lucide/angular';

/**
 * An <img> that swaps in a placeholder icon if it fails to load, and fades in once it has
 * (.img-pending / .img-in in styles.css), as frontend/src/components/SafeImage.jsx does.
 * Both are tracked per source, so switching to another picture fades that one in and gives it
 * its own chance to load. `element()` hands out the <img>, e.g. for flyToCart.
 */
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

  private readonly failedSrc = signal<string | undefined | null>(null);
  private readonly loadedSrc = signal<string | undefined | null>(null);
  protected readonly failed = computed(() => this.failedSrc() === this.src());
  protected readonly loaded = computed(() => this.loadedSrc() === this.src());

  private readonly img = viewChild<ElementRef<HTMLImageElement>>('img');

  element(): HTMLImageElement | null {
    return this.img()?.nativeElement ?? null;
  }

  onLoad(): void {
    this.loadedSrc.set(this.src());
  }

  onError(): void {
    this.failedSrc.set(this.src());
  }
}

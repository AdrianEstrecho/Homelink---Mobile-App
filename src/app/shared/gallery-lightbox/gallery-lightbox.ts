import { Component, DestroyRef, HostListener, inject, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';

import { GalleryItem } from '../../core/gallery.model';
import { SafeImage } from '../safe-image/safe-image';

@Component({
  selector: 'app-gallery-lightbox',
  imports: [SafeImage, LucideX, LucideChevronLeft, LucideChevronRight],
  templateUrl: './gallery-lightbox.html',
  styleUrl: './gallery-lightbox.css',
})
export class GalleryLightbox {
  readonly items = input.required<GalleryItem[]>();
  readonly index = input.required<number>();
  readonly closed = output<void>();
  readonly navigated = output<number>();

  constructor() {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = prevOverflow;
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.closed.emit();
    else if (e.key === 'ArrowLeft') this.prev();
    else if (e.key === 'ArrowRight') this.next();
  }

  item(): GalleryItem | undefined {
    return this.items()[this.index()];
  }

  prev(): void {
    const len = this.items().length;
    this.navigated.emit((this.index() - 1 + len) % len);
  }

  next(): void {
    const len = this.items().length;
    this.navigated.emit((this.index() + 1) % len);
  }
}

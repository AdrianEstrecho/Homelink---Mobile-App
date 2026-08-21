import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { GalleryItem } from '../../core/gallery.model';
import { ErrorState } from '../../shared/error-state/error-state';
import { GalleryLightbox } from '../../shared/gallery-lightbox/gallery-lightbox';
import { RevealDirective } from '../../shared/reveal.directive';
import { SafeImage } from '../../shared/safe-image/safe-image';
import { GallerySkeleton } from '../../shared/skeleton/gallery-skeleton/gallery-skeleton';

interface LoadState<T> {
  data: T[];
  loading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-gallery',
  imports: [RouterLink, ErrorState, RevealDirective, SafeImage, GalleryLightbox, GallerySkeleton, LucideArrowRight],
  templateUrl: './gallery.html',
  styleUrl: './gallery.css',
})
export class Gallery {
  private api = inject(ApiService);

  protected readonly items = signal<LoadState<GalleryItem>>({ data: [], loading: true, error: false });
  protected readonly category = signal('');
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly categories = computed(() => [...new Set(this.items().data.map((g) => g.category).filter(Boolean))]);
  protected readonly filtered = computed(() =>
    this.category() ? this.items().data.filter((g) => g.category === this.category()) : this.items().data
  );

  constructor() {
    this.loadItems();
  }

  loadItems(): void {
    this.items.update((s) => ({ ...s, loading: true, error: false }));
    this.api
      .get<GalleryItem[]>('/gallery')
      .then((data) => this.items.set({ data, loading: false, error: false }))
      .catch(() => this.items.set({ data: [], loading: false, error: true }));
  }

  navigate(index: number): void {
    this.lightboxIndex.set(index);
  }
}

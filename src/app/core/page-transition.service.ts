import { Injectable, signal } from '@angular/core';

export interface PageCover {
  path: string;
  /** Runs once the screen is covered, before navigating (e.g. logging out). */
  before?: () => unknown;
}

/**
 * Lets any page trigger the full-screen delivery transition (shared/page-transition-overlay),
 * which App renders so it outlives the page that started it — ported from the web's
 * PageTransitionContext. Used for the moments that deserve ceremony: entering the login flow
 * and logging out. Every other navigation gets the usual page animation.
 */
@Injectable({ providedIn: 'root' })
export class PageTransitionService {
  readonly cover = signal<PageCover | null>(null);

  coverTo(path: string, before?: () => unknown): void {
    if (this.cover()) return;
    this.cover.set({ path, before });
  }

  end(): void {
    this.cover.set(null);
  }
}

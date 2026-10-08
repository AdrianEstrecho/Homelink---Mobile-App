import { Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';

/**
 * Ported from frontend/src/components/SplitText.jsx — heading text whose words rise one after
 * another out of a mask as it scrolls into view (.split-word in styles.css). Screen readers get
 * the plain sentence; the animated words are hidden from them. Drop it inside the heading
 * element in place of the text.
 */
@Component({
  selector: 'app-split-text',
  template: `
    <span class="sr-only">{{ text() }}</span>
    <span aria-hidden="true">
      @for (word of words(); track $index; let i = $index) {
        @if (i > 0) {
          {{ ' ' }}
        }
        <span class="split-word"><span [style.--i]="i">{{ word }}</span></span>
      }
    </span>
  `,
  host: { '[class.split-in]': 'inView()' },
})
export class SplitText {
  readonly text = input.required<string>();

  protected readonly words = computed(() => this.text().split(' '));
  protected readonly inView = signal(false);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    if (typeof IntersectionObserver === 'undefined') {
      this.inView.set(true);
      return;
    }
    // Same trigger as RevealDirective, so a heading rises alongside the block it heads.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.inView.set(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}

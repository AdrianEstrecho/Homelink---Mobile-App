import { DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

/**
 * Angular analog of frontend/src/components/Reveal.jsx +
 * frontend/src/hooks/useReveal.js — an attribute directive rather than a
 * wrapper component, so it applies the reveal/reveal-in classes directly to
 * the host element instead of introducing an extra wrapping div (React
 * needs the wrapper only because it has no equivalent of "add a directive
 * to an existing element").
 *
 * Usage: <div appReveal [revealDelay]="80">...</div>
 */
@Directive({
  selector: '[appReveal]',
  host: {
    class: 'reveal',
    '[class.reveal-in]': 'inView()',
    '[style.transition-delay]': "inView() ? revealDelay() + 'ms' : '0ms'",
  },
})
export class RevealDirective {
  readonly revealDelay = input(0);

  protected readonly inView = signal(false);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);

    if (typeof IntersectionObserver === 'undefined') {
      this.inView.set(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.inView.set(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    destroyRef.onDestroy(() => observer.disconnect());
  }
}

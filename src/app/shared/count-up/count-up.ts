import { Component, DestroyRef, ElementRef, OnInit, inject, input, signal } from '@angular/core';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface ParsedValue {
  target: number;
  decimals: number;
  suffix: string;
}

// "10,000+" -> { target: 10000, decimals: 0, suffix: '+' }
// "4.8/5"   -> { target: 4.8, decimals: 1, suffix: '/5' }
function parseValue(raw: string): ParsedValue {
  const match = String(raw).match(/^([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return { target: 0, decimals: 0, suffix: raw };
  const [, numStr, suffix] = match;
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
  return { target: parseFloat(numStr.replace(/,/g, '')), decimals, suffix };
}

function format(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-US');
}

/**
 * Ported from frontend/src/components/CountUp.jsx — counts up from 0 once
 * its own element scrolls into view, then keeps the trailing suffix ("+",
 * "/5", ...) static.
 */
@Component({
  selector: 'app-count-up',
  imports: [],
  template: '{{ display() }}{{ suffix }}',
  host: { class: 'tabular-nums' },
})
export class CountUp implements OnInit {
  readonly value = input.required<string>();
  readonly duration = input(1400);
  readonly delay = input(0);

  private el = inject(ElementRef<HTMLElement>).nativeElement;
  private destroyRef = inject(DestroyRef);

  protected readonly display = signal('0');
  protected suffix = '';

  ngOnInit(): void {
    const { target, decimals, suffix } = parseValue(this.value());
    this.suffix = suffix;
    this.display.set(format(0, decimals));

    if (typeof IntersectionObserver === 'undefined') {
      this.display.set(format(target, decimals));
      return;
    }

    let raf: number | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(this.el);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          this.display.set(format(target, decimals));
          return;
        }

        startTimer = setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, Math.max(0, (now - start) / this.duration()));
            this.display.set(format(target * easeOutCubic(t), decimals));
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, this.delay());
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(this.el);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      if (startTimer) clearTimeout(startTimer);
      if (raf) cancelAnimationFrame(raf);
    });
  }
}

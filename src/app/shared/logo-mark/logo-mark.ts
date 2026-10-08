import { Component, input } from '@angular/core';

// Ported from frontend/src/components/brand/Logo.jsx: HomeLink's mark, a house with a wrench
// swept in beneath it, traced from the brand artwork. public/favicon.svg carries the same paths.
export const MARK_VIEWBOX = '0 0 190 162';
export const HOUSE_PATH =
  'M3 79.88L94.92 7.5Q100 2.9 105.08 7.5L148 41.3L148 26L171.5 26L171.5 59.8L187 72L187 105.1L100 32.6L46 75.12L46 118L99 118L41.25 156.5L39 156.5A20 20 0 0 1 19 136.5L19 89L3 89Z';
export const WRENCH_PATH =
  'M51 157.43L146.28 157.43A33.63 33.63 0 0 0 179.45 118.27L156.63 129.69A12.52 12.52 0 0 1 145.43 107.29L166.36 96.82A33.63 33.63 0 0 0 113.34 117Z';
export const PANES: [number, number][] = [
  [79, 63.5],
  [98.5, 63.5],
  [79, 83],
  [98.5, 83],
];

/**
 * The mark on its own. The house is drawn in currentColor, so set a text colour for the
 * surface: navy on light ones, white on dark ones. The wrench is always brand orange unless
 * `wrench` says otherwise — pass "currentColor" for a one-colour mark, e.g. on an orange tile.
 * Size it with a width class; the height follows the artwork's proportions.
 */
@Component({
  selector: 'app-logo-mark',
  host: { class: 'inline-block shrink-0' },
  template: `
    <svg [attr.viewBox]="viewBox" class="block w-full h-auto overflow-visible" aria-hidden="true">
      <!-- A same-colour stroke with round joins softens every corner, as in the artwork. -->
      <path [attr.d]="housePath" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      @for (p of panes; track $index) {
        <rect [attr.x]="p[0]" [attr.y]="p[1]" width="15.5" height="15.5" rx="1.2" fill="currentColor" />
      }
      <path
        [attr.d]="wrenchPath"
        [attr.fill]="wrench()"
        [attr.stroke]="wrench()"
        stroke-width="2"
        stroke-linejoin="round"
        class="logo-wrench"
        style="transform-origin: 151px 118.5px"
      />
    </svg>
  `,
})
export class LogoMark {
  readonly wrench = input('#ff6b35');

  protected readonly viewBox = MARK_VIEWBOX;
  protected readonly housePath = HOUSE_PATH;
  protected readonly wrenchPath = WRENCH_PATH;
  protected readonly panes = PANES;
}

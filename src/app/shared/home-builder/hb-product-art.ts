import { Component, input } from '@angular/core';

export type HbProductId = 'solar' | 'ac' | 'heater' | 'bulb' | 'lock' | 'cctv';

const SOLAR_CELLS = [0, 1].flatMap((r) =>
  [0, 1, 2, 3].map((c) => {
    const x = c * 30;
    const y = r * 31;
    return { key: `${r}${c}`, x, y, lines: `M${x + 14} ${y}v29M${x} ${y + 9.7}h28M${x} ${y + 19.3}h28` };
  }),
);
const LOCK_KEYS = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => ({ key: `${r}${c}`, cx: 5 + c * 6, cy: 12 + r * 5 })));

/**
 * One house-builder product's artwork (ported from HomeBuilder.jsx's ProductArt), drawn inside
 * its own box from 0,0. `live` adds what it does once installed: the solar glint, the aircon's
 * breeze, the camera's sweep... Use on an SVG group: `<svg:g appHbProductArt [productId]="..." />`.
 */
@Component({
  selector: '[appHbProductArt]',
  template: `
    @switch (productId()) {
      @case ('solar') {
        <svg:rect x="-2" y="-2" width="124" height="66" rx="3" fill="#0b1f44" />
        <svg:g [attr.clip-path]="live() && clipId() ? 'url(#' + clipId() + ')' : null">
          @for (c of solarCells; track c.key) {
            <svg:rect [attr.x]="c.x" [attr.y]="c.y" width="28" height="29" rx="1" fill="#1a4a8a" />
            <svg:path [attr.d]="c.lines" stroke="#6ea8ff" stroke-width=".8" opacity=".7" />
          }
          <svg:path d="M8 60L42 2H52L18 60Z" fill="#fff" opacity=".1" />
          @if (live()) {
            <svg:rect class="hb-glint" x="-24" y="-6" width="14" height="76" fill="#fff" opacity=".45" />
          }
        </svg:g>
      }
      @case ('ac') {
        <svg:rect x="0" y="0" width="96" height="28" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" />
        <svg:rect x="4" y="18" width="88" height="6" rx="2" fill="#e2e8f0" />
        <svg:path d="M8 21h80" stroke="#cbd5e1" stroke-width="1" />
        <svg:rect x="8" y="6" width="9" height="6" rx="1.5" fill="#ff6b35" />
        <svg:circle cx="86" cy="9" r="2" [attr.fill]="live() ? '#00a896' : '#cbd5e1'" [attr.class]="live() ? 'hb-blink' : null" />
        @if (live()) {
          <svg:g fill="none" stroke="#7cc4f0" stroke-width="2" stroke-linecap="round">
            @for (x of [22, 48, 74]; track x; let i = $index) {
              <svg:path class="hb-air" [style.animation-delay]="i * -0.6 + 's'" [attr.d]="'M' + x + ' 32q3 4 0 8t0 8'" />
            }
          </svg:g>
        }
      }
      @case ('heater') {
        <svg:path d="M12 62v12" stroke="#ef4444" stroke-width="3" />
        <svg:path d="M28 62v12" stroke="#3b82f6" stroke-width="3" />
        <svg:rect x="0" y="0" width="40" height="62" rx="12" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5" />
        <svg:rect x="1" y="40" width="38" height="5" fill="#ff6b35" />
        <svg:circle cx="20" cy="20" r="7" fill="#fff" stroke="#94a3b8" stroke-width="1.2" />
        <svg:path
          [attr.d]="live() ? 'M20 20l5-3' : 'M20 20l-4-4'"
          [attr.stroke]="live() ? '#ef4444' : '#94a3b8'"
          stroke-width="1.6"
          stroke-linecap="round"
        />
        <svg:circle cx="20" cy="52" r="2.2" [attr.fill]="live() ? '#ef4444' : '#cbd5e1'" [attr.class]="live() ? 'hb-blink' : null" />
      }
      @case ('bulb') {
        <svg:path d="M15 0v18" stroke="#475569" stroke-width="1.5" />
        <svg:rect x="10" y="17" width="10" height="7" rx="1.5" fill="#475569" />
        @if (live()) {
          <svg:circle class="hb-glow" cx="15" cy="33" r="18" fill="#ffd27a" opacity=".4" />
        }
        <svg:circle cx="15" cy="33" r="9" [attr.fill]="live() ? '#ffe28a' : '#fff6d6'" stroke="#f5b93d" stroke-width="1.4" />
        <svg:path d="M11.5 33q1.75-3 3.5 0t3.5 0" [attr.stroke]="live() ? '#e08a00' : '#d6a23a'" stroke-width="1.2" fill="none" />
      }
      @case ('lock') {
        <svg:rect x="0" y="0" width="22" height="34" rx="4" fill="#1f2937" />
        <svg:circle cx="11" cy="5.5" r="2" [attr.fill]="live() ? '#00a896' : '#475569'" [attr.class]="live() ? 'hb-blink' : null" />
        @for (k of lockKeys; track k.key) {
          <svg:circle [attr.cx]="k.cx" [attr.cy]="k.cy" r="1.3" fill="#94a3b8" />
        }
        <svg:rect x="3" y="28" width="16" height="3" rx="1.5" fill="#cbd5e1" />
        @if (live()) {
          <!-- Positioned by the outer group: the pop's CSS transform would replace a transform attribute. -->
          <svg:g transform="translate(-6 -30)">
            <svg:g class="hb-pop">
              <svg:circle cx="14" cy="10" r="9" fill="#00a896" />
              <svg:path d="M10 10l3 3 5-6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg:g>
          </svg:g>
        }
      }
      @case ('cctv') {
        @if (live()) {
          <svg:path class="hb-scan" d="M6 18L-22 48L-4 58Z" fill="#ff6b35" opacity=".16" />
        }
        <svg:path d="M32 14H44" stroke="#94a3b8" stroke-width="3" />
        <svg:rect x="42" y="6" width="4" height="16" rx="1" fill="#94a3b8" />
        <svg:g transform="rotate(-16 22 14)">
          <svg:rect x="2" y="7" width="32" height="14" rx="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.2" />
          <svg:rect x="0" y="5" width="30" height="4" rx="2" fill="#e2e8f0" />
          <svg:circle cx="6" cy="14" r="3.2" fill="#1f2937" />
          <svg:circle cx="28" cy="11.5" r="1.4" [attr.fill]="live() ? '#ef4444' : '#cbd5e1'" [attr.class]="live() ? 'hb-blink' : null" />
        </svg:g>
      }
    }
  `,
})
export class HbProductArt {
  readonly productId = input.required<HbProductId>();
  readonly live = input(false);
  /** The solar panel's clip path id (defined once in the scene), so its glint stays on the panel. */
  readonly clipId = input<string>();

  protected readonly solarCells = SOLAR_CELLS;
  protected readonly lockKeys = LOCK_KEYS;
}

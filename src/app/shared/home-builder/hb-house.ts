import { Component, computed, input } from '@angular/core';

import { HB_PRODUCTS } from './home-builder.data';
import { HbProductArt, HbProductId } from './hb-product-art';

const ROOF_LINES = [76, 94, 112, 130]
  .map((y) => {
    const k = ((y - 58) * 70) / 94;
    return `M${106 - k} ${y}H${374 + k}`;
  })
  .join('');
const TILES = [
  ...Array.from({ length: 11 }, (_, i) => `M${258 + i * 14} 166V256`),
  ...Array.from({ length: 6 }, (_, i) => `M244 ${180 + i * 14}H410`),
].join('');

/** A window with its frame, sill, glint and glazing bars. */
function windowPaths(x: number, y: number, w: number, h: number) {
  return {
    x,
    y,
    w,
    h,
    glint: `M${x + w * 0.12} ${y + h}L${x + w * 0.5} ${y}H${x + w * 0.68}L${x + w * 0.3} ${y + h}Z`,
    bars: `M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`,
  };
}
const WINDOWS = [windowPaths(190, 180, 36, 40), windowPaths(84, 290, 38, 36)];

/** A tree whose crown sways, standing on `ground`. */
export function treeShape(x: number, ground: number, h: number) {
  return {
    trunk: { x: x - 3, y: ground - h * 0.5, height: h * 0.5 },
    crown: [
      { cx: x, cy: ground - h * 0.64, r: h * 0.3, fill: '#3fae86' },
      { cx: x - h * 0.17, cy: ground - h * 0.52, r: h * 0.21, fill: '#4fbf96' },
      { cx: x + h * 0.18, cy: ground - h * 0.55, r: h * 0.2, fill: '#2f9e78' },
      { cx: x - h * 0.06, cy: ground - h * 0.78, r: h * 0.15, fill: '#62cca4' },
    ],
  };
}
const HOUSE_TREE = treeShape(458, 378, 80);

/**
 * The house builder's cut-away house (HomeBuilder.jsx's House): the front wall is off, so the
 * room each product belongs in shows. Drawn in a 480x400 space with its ground at y=376; the
 * scene places and scales it. Rooms come to life as their product is installed.
 */
@Component({
  selector: '[appHbHouse]',
  imports: [HbProductArt],
  template: `
    <!-- A tree and a hedge either side -->
    <svg:rect [attr.x]="tree.trunk.x" [attr.y]="tree.trunk.y" width="6" [attr.height]="tree.trunk.height" rx="2" fill="#a86f45" />
    <svg:g class="hb-sway">
      @for (c of tree.crown; track $index) {
        <svg:circle [attr.cx]="c.cx" [attr.cy]="c.cy" [attr.r]="c.r" [attr.fill]="c.fill" />
      }
    </svg:g>
    <svg:circle cx="18" cy="370" r="9" fill="#4fbf96" />
    <svg:circle cx="32" cy="367" r="11" fill="#3fae86" />
    <svg:circle cx="46" cy="371" r="8" fill="#4fbf96" />

    <!-- Roof -->
    <svg:rect x="138" y="40" width="24" height="52" fill="#0b1f44" />
    <svg:rect x="134" y="36" width="32" height="8" rx="2" fill="#0f2b5b" />
    <svg:path d="M36 152L106 58H374L444 152Z" fill="#0f2b5b" />
    <svg:path [attr.d]="roofLines" stroke="#1a4a8a" stroke-width="1.5" />
    <svg:path d="M106 58H374" stroke="#1a4a8a" stroke-width="5" stroke-linecap="round" />
    <svg:path d="M28 150H452L446 158H34Z" fill="#0b1f44" />

    <!-- Shell and rooms -->
    <svg:rect x="58" y="158" width="364" height="220" fill="#e4ddd2" />
    <svg:rect x="70" y="166" width="166" height="96" fill="#f6efe4" />
    <svg:rect x="244" y="166" width="166" height="96" fill="#e9f3f9" />
    <svg:path [attr.d]="tiles" stroke="#d4e5f0" stroke-width="1" />
    <svg:rect x="70" y="272" width="166" height="100" fill="#fbf3ea" />
    <svg:rect x="244" y="272" width="166" height="100" fill="#f1ece4" />
    <svg:rect x="70" y="256" width="166" height="6" fill="#d9c3a5" />
    <svg:rect x="244" y="256" width="166" height="6" fill="#c7d9e6" />
    <svg:rect x="70" y="366" width="340" height="6" fill="#d9c3a5" />
    <svg:rect x="58" y="262" width="364" height="10" fill="#cfc6b8" />
    <svg:rect x="236" y="166" width="8" height="200" fill="#cfc6b8" />
    <svg:rect x="54" y="372" width="372" height="8" rx="1" fill="#bdb4a5" />

    @for (w of windows; track $index) {
      <svg:rect [attr.x]="w.x - 2" [attr.y]="w.y - 2" [attr.width]="w.w + 4" [attr.height]="w.h + 4" rx="2" fill="#fff" stroke="#e2ddd3" stroke-width=".8" />
      <svg:rect [attr.x]="w.x" [attr.y]="w.y" [attr.width]="w.w" [attr.height]="w.h" fill="#bfdcf5" />
      <svg:path [attr.d]="w.glint" fill="#fff" opacity=".35" />
      <svg:path [attr.d]="w.bars" stroke="#fff" stroke-width="2" />
      <svg:rect [attr.x]="w.x - 4" [attr.y]="w.y + w.h + 2" [attr.width]="w.w + 8" height="3" rx="1" fill="#e2ddd3" />
    }

    <!-- Bedroom -->
    <svg:rect x="82" y="226" width="20" height="30" rx="3" fill="#1a4a8a" />
    <svg:rect x="84" y="238" width="96" height="14" rx="3" fill="#fff" stroke="#e2ddd3" />
    <svg:rect x="104" y="230" width="18" height="10" rx="4" fill="#fff" stroke="#e2ddd3" />
    <svg:rect x="124" y="234" width="56" height="16" rx="4" fill="#00a896" />
    <svg:rect x="84" y="252" width="96" height="4" fill="#0f2b5b" />
    <svg:rect x="196" y="238" width="20" height="18" rx="2" fill="#c98b5a" />
    <svg:path d="M206 238v-7" stroke="#475569" stroke-width="1.5" />
    <svg:path d="M199 231h14l-3-8h-8Z" fill="#ff6b35" />
    <svg:rect x="70" y="166" width="166" height="96" fill="#9fd4f5" class="hb-fade" [style.opacity]="on('ac') ? 0.22 : 0" />

    <!-- Bathroom -->
    <svg:path d="M297 166v14h-8" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round" />
    <svg:path d="M280 180h18l-3 7h-12Z" fill="#94a3b8" />
    @if (on('heater')) {
      <svg:g>
        <svg:g stroke="#7cc4f0" stroke-width="1.6" stroke-linecap="round">
          @for (x of [284, 289, 294]; track x; let i = $index) {
            <svg:path class="hb-drip" [style.animation-delay]="i * -0.2 + 's'" [attr.d]="'M' + x + ' 190V226'" />
          }
        </svg:g>
        @for (x of [270, 300, 326]; track x; let i = $index) {
          <svg:circle class="hb-steam" [style.animation-delay]="i * -0.9 + 's'" [attr.cx]="x" cy="222" r="7" fill="#fff" opacity=".8" />
        }
      </svg:g>
    }
    <svg:rect x="258" y="226" width="78" height="8" rx="4" fill="#fff" stroke="#cbd5e1" />
    <svg:rect x="254" y="230" width="86" height="26" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="1.5" />
    <svg:rect x="262" y="254" width="4" height="4" fill="#94a3b8" />
    <svg:rect x="328" y="254" width="4" height="4" fill="#94a3b8" />
    <svg:rect x="342" y="194" width="14" height="3" rx="1.5" fill="#94a3b8" />
    <svg:rect x="344" y="197" width="10" height="28" rx="2" fill="#ff6b35" opacity=".85" />

    <!-- Living room -->
    <svg:rect x="184" y="292" width="36" height="26" rx="2" fill="#fff" stroke="#e2ddd3" />
    <svg:path d="M188 314l10-12 8 8 5-5 7 9Z" fill="#00a896" opacity=".7" />
    <svg:circle cx="210" cy="300" r="3" fill="#ff6b35" />
    <svg:rect x="96" y="334" width="112" height="22" rx="6" fill="#1a4a8a" />
    <svg:rect x="90" y="346" width="124" height="16" rx="5" fill="#0f2b5b" />
    <svg:rect x="86" y="340" width="12" height="24" rx="5" fill="#1a4a8a" />
    <svg:rect x="206" y="340" width="12" height="24" rx="5" fill="#1a4a8a" />
    <svg:rect x="108" y="338" width="20" height="12" rx="3" fill="#ff6b35" />
    <svg:rect x="176" y="338" width="20" height="12" rx="3" fill="#00a896" />
    <svg:rect x="96" y="362" width="3" height="4" fill="#0b1f44" />
    <svg:rect x="205" y="362" width="3" height="4" fill="#0b1f44" />
    <svg:rect x="221" y="352" width="11" height="14" rx="2" fill="#c98b5a" />
    <svg:circle cx="226" cy="346" r="6" fill="#3fae86" />
    <svg:circle cx="222" cy="341" r="4" fill="#4fbf96" />
    <svg:rect x="70" y="272" width="166" height="94" fill="#0f2b5b" class="hb-fade" [style.opacity]="on('bulb') ? 0 : 0.2" />
    <svg:ellipse
      cx="153"
      cy="330"
      rx="110"
      ry="80"
      [attr.fill]="'url(#' + uid() + '-warm)'"
      [attr.clip-path]="'url(#' + uid() + '-living)'"
      class="hb-fade"
      [style.opacity]="on('bulb') ? 1 : 0"
    />

    <!-- Hall -->
    <svg:circle cx="384" cy="292" r="8" fill="#fff" stroke="#cbd5e1" stroke-width="1.5" />
    <svg:path d="M384 292v-5M384 292h4" stroke="#475569" stroke-width="1.2" stroke-linecap="round" />
    <svg:rect x="256" y="338" width="28" height="4" rx="1" fill="#c98b5a" />
    <svg:rect x="258" y="342" width="3" height="24" fill="#a86f45" />
    <svg:rect x="279" y="342" width="3" height="24" fill="#a86f45" />
    <svg:rect x="264" y="326" width="10" height="12" rx="3" fill="#00a896" />
    <svg:rect x="292" y="296" width="62" height="70" rx="2" fill="#fff" stroke="#e2ddd3" />
    <svg:rect x="296" y="300" width="54" height="66" rx="1.5" fill="#c98b5a" />
    <svg:rect x="302" y="306" width="18" height="24" rx="1" fill="#b57a4c" />
    <svg:rect x="326" y="306" width="18" height="24" rx="1" fill="#b57a4c" />
    <svg:rect x="302" y="336" width="18" height="24" rx="1" fill="#b57a4c" />
    <svg:rect x="326" y="336" width="18" height="24" rx="1" fill="#b57a4c" />
    <svg:rect x="290" y="362" width="66" height="4" rx="2" fill="#0f2b5b" opacity=".55" />
    <svg:rect x="368" y="310" width="4" height="7" fill="#475569" />
    <svg:circle cx="370" cy="306" r="4.5" fill="#ffd27a" class="hb-fade" [style.opacity]="on('lock') ? 1 : 0" />
    <svg:circle cx="370" cy="306" r="4.5" fill="none" stroke="#cbd5e1" stroke-width="1.2" />

    <!-- Installed products, on top of everything -->
    @for (p of installedProducts(); track p.id) {
      <svg:g [attr.transform]="'translate(' + p.at[0] + ' ' + p.at[1] + ')'">
        <svg:g class="hb-pop">
          <svg:g appHbProductArt [productId]="p.id" [live]="true" [clipId]="uid() + '-solar'" />
        </svg:g>
        <svg:circle
          class="hb-ring"
          [attr.cx]="p.box[0] / 2"
          [attr.cy]="p.box[1] / 2"
          [attr.r]="max(p.box[0], p.box[1]) / 2 + 4"
          fill="none"
          stroke="#00a896"
          stroke-width="3"
        />
      </svg:g>
    }
  `,
})
export class HbHouse {
  readonly installed = input.required<Partial<Record<HbProductId, boolean>>>();
  readonly uid = input.required<string>();

  protected readonly tree = HOUSE_TREE;
  protected readonly roofLines = ROOF_LINES;
  protected readonly tiles = TILES;
  protected readonly windows = WINDOWS;
  protected readonly max = Math.max;
  protected readonly installedProducts = computed(() => HB_PRODUCTS.filter((p) => this.installed()[p.id]));

  protected on(id: HbProductId): boolean {
    return !!this.installed()[id];
  }
}

import { Component, input } from '@angular/core';

export const TRUCK_SIZE = [440, 270] as const;
export const TRUCK_WHEELS = [70, 128, 368];
export const TRUCK_WHEEL_Y = 236;
export const TRUCK_WHEEL_R = 26;

const SHUTTER_SLATS = Array.from({ length: 20 }, (_, i) => `M18 ${30 + i * 8}h276`).join('');

/**
 * Ported from frontend/src/components/DeliveryTruck.jsx — the HomeLink box truck, facing right
 * with the cab at the front, drawn in a 440x270 space with the wheels touching y=262. Use it on
 * an SVG group inside an <svg>: `<svg:g appDeliveryTruck [open]="true" />`. Parked in the house
 * builder it has its side shutter rolled `open` onto two shelves and its `hazards` blinking; out
 * driving (the team page, the page transition) the shutter is down, showing the logo, and the
 * caller can spin the `.truck-wheel` groups (a `rotate(angle cx cy)` transform attribute) and
 * bounce the body via `bodyClass`.
 */
@Component({
  selector: '[appDeliveryTruck]',
  template: `
    <svg:ellipse cx="220" cy="263" rx="214" ry="7" fill="#0b1324" opacity=".25" />

    <svg:g [attr.class]="bodyClass() || null">
      <!-- Cargo box -->
      <svg:rect x="6" y="0" width="300" height="218" rx="12" fill="#0f2b5b" />
      <svg:text x="156" y="16" text-anchor="middle" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="14" fill="#fff">
        Home<svg:tspan fill="#ff6b35">Link</svg:tspan>
        <svg:tspan font-size="9" font-weight="700" fill="#9fc3ea" dx="6" letter-spacing="1.5">DELIVERY</svg:tspan>
      </svg:text>
      @if (open()) {
        <svg:g>
          <svg:rect x="20" y="46" width="272" height="150" rx="4" fill="#e8edf3" />
          <svg:rect x="20" y="46" width="272" height="10" fill="#0f2b5b" opacity=".08" />
          <svg:path d="M110 46V191M201 46V191" stroke="#cbd5e1" stroke-width="3" />
          <svg:rect x="20" y="118" width="272" height="5" fill="#c98b5a" />
          <svg:rect x="20" y="191" width="272" height="5" fill="#c98b5a" />
          <svg:rect x="14" y="22" width="284" height="24" rx="6" fill="#e2e8f0" />
          <svg:path d="M18 28h276M18 34h276M18 40h276" stroke="#cbd5e1" stroke-width="1.5" />
          <svg:rect x="140" y="42" width="32" height="5" rx="2" fill="#94a3b8" />
        </svg:g>
      } @else {
        <svg:g>
          <svg:rect x="14" y="22" width="284" height="174" rx="6" fill="#e2e8f0" />
          <svg:path [attr.d]="shutterSlats" stroke="#d5dde7" stroke-width="1.5" />
          <svg:rect x="48" y="70" width="216" height="76" rx="14" fill="#fff" stroke="#d5dde7" />
          <svg:rect x="64" y="86" width="44" height="44" rx="11" fill="#ff6b35" />
          <svg:path d="M72 110l14-12 14 12v14H72Z" fill="#fff" />
          <svg:rect x="82" y="113" width="8" height="11" rx="1" fill="#ff6b35" />
          <svg:text x="118" y="114" font-family="Archivo, system-ui, sans-serif" font-weight="800" font-size="26" fill="#0f2b5b">
            Home<svg:tspan fill="#ff6b35">Link</svg:tspan>
          </svg:text>
          <svg:text x="119" y="132" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="8.5" letter-spacing="1.4" fill="#64748b">
            DELIVERY &amp; INSTALLATION
          </svg:text>
          <svg:rect x="140" y="186" width="32" height="5" rx="2" fill="#94a3b8" />
        </svg:g>
      }
      <svg:rect x="6" y="200" width="300" height="8" fill="#ff6b35" />
      <svg:rect x="0" y="168" width="7" height="16" rx="2" fill="#ffb020" [attr.class]="hazards() ? 'hb-blink' : null" />

      <!-- Cab -->
      <svg:path d="M306 218V96a10 10 0 0 1 10-10h62a14 14 0 0 1 11.8 6.5L422 144a8 8 0 0 0 5 3h1a8 8 0 0 1 8 8V218Z" fill="#ff6b35" />
      <svg:path d="M346 98h28a8 8 0 0 1 6.8 3.8L404 140h-58Z" fill="#bfe3ff" />
      <svg:path d="M357 103l-6 28" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6" />
      <svg:path d="M340 104v108" stroke="#c8461a" stroke-width="1.5" />
      <svg:rect x="312" y="150" width="22" height="22" rx="5" fill="#0f2b5b" />
      <svg:path d="M317 163l6-5 6 5v6h-12Z" fill="#fff" />
      <svg:rect x="346" y="152" width="10" height="3.5" rx="1.5" fill="#c8461a" />
      <svg:rect x="428" y="160" width="8" height="11" rx="2" fill="#fde68a" />
      <svg:circle cx="432" cy="152" r="3" fill="#ffb020" [attr.class]="hazards() ? 'hb-blink' : null" />
      <svg:rect x="420" y="206" width="20" height="10" rx="3" fill="#cbd5e1" />
      <svg:rect x="306" y="200" width="122" height="8" fill="#e85a28" />

      <!-- Chassis -->
      <svg:rect x="10" y="214" width="420" height="14" rx="4" fill="#0b1f44" />
      @for (cx of wheels; track cx) {
        <svg:path [attr.d]="'M' + (cx - 30) + ' ' + wheelY + 'a30 30 0 0 1 60 0Z'" fill="#0b1f44" />
      }
    </svg:g>

    <!-- Wheels: spoked so they visibly turn when a caller rotates them -->
    @for (cx of wheels; track cx) {
      <svg:g class="truck-wheel">
        <svg:circle [attr.cx]="cx" [attr.cy]="wheelY" [attr.r]="wheelR" fill="#1f2937" />
        <svg:circle [attr.cx]="cx" [attr.cy]="wheelY" r="14" fill="#cbd5e1" />
        <svg:path
          [attr.d]="'M' + (cx - 11) + ' ' + wheelY + 'h22M' + cx + ' ' + (wheelY - 11) + 'v22'"
          stroke="#94a3b8"
          stroke-width="3"
          stroke-linecap="round"
        />
        <svg:circle [attr.cx]="cx" [attr.cy]="wheelY" r="4.5" fill="#64748b" />
      </svg:g>
    }
  `,
})
export class DeliveryTruck {
  readonly open = input(false);
  readonly hazards = input(false);
  /** Class for the body (everything but the wheels), e.g. a bounce while driving. */
  readonly bodyClass = input('');

  protected readonly wheels = TRUCK_WHEELS;
  protected readonly wheelY = TRUCK_WHEEL_Y;
  protected readonly wheelR = TRUCK_WHEEL_R;
  protected readonly shutterSlats = SHUTTER_SLATS;
}

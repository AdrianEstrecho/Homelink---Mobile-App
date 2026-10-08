import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { PageTransitionService } from '../../core/page-transition.service';
import { HOUSE_PATH, LogoMark, PANES } from '../logo-mark/logo-mark';

// Ported from frontend/src/components/PageTransitionOverlay.jsx. A HomeLink truck drives across
// the screen from left to right, and its exhaust billows into a cloud that swallows the page
// behind it. Once nothing shows through, the route changes out of sight, the logo surfaces in
// the smoke for a beat, then the cloud breaks up and drifts off after the truck, uncovering the
// new page.
//
// The web reloads the page under the smoke when logging out and has the reloaded page clear it;
// here a reload would replay the app's launch splash, so the cover just navigates and clears.
//
// The smoke is a canvas. Every puff is a circle, and each frame fills the union of all of them
// three times (shadow, body, highlight), so the cloud reads as one shaded mass rather than a
// heap of outlined balls. The truck is an SVG moved from the same frame loop. Reduced motion
// gets a plain fade instead of both.

// Cool greys, so the cloud reads as smoke on white pages and on the navy topbar alike.
const SHADE = '#c9d1dd';
const BODY = '226, 231, 239';
const LIGHT = '#f3f5f9';

// Timeline (ms of animation time, which runs with the clock but never more than MAX_STEP a frame).
const DRIVE = 1000; // the truck crosses the screen
const COVERED = 1250; // nothing of the old page shows any more
const HOLD = 320; // the logo sits on the settled cloud
const CLEAR = 850; // the cloud breaks up and blows away
// The page swap under the cover can stall the main thread for a few frames. Capping each step
// makes the smoke and truck carry on from where they were instead of lurching ahead to catch up.
const MAX_STEP = 40;

// The truck art's viewBox, and where its exhaust pipe's mouth is in it.
const TRUCK_W = 212;
const TRUCK_H = 112;
const EXHAUST = { x: 1 / TRUCK_W, y: 82.5 / TRUCK_H };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => lerp(a, b, Math.random());
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
// Gathers a little speed as it goes.
const driveEase = (t: number) => t * (0.7 + 0.3 * t);

interface Puff {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r0: number;
  r1: number;
  born: number;
  grow: number;
  x: number;
  y: number;
  r: number;
  delay: number;
  dur: number;
  wx: number;
  wy: number;
}

@Component({
  selector: 'app-page-transition-overlay',
  imports: [LogoMark],
  templateUrl: './page-transition-overlay.html',
})
export class PageTransitionOverlay {
  private transition = inject(PageTransitionService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  protected readonly housePath = HOUSE_PATH;
  protected readonly panes = PANES;

  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly truck = viewChild.required<ElementRef<HTMLElement>>('truck');
  private readonly brand = viewChild.required<ElementRef<HTMLElement>>('brand');

  constructor() {
    afterNextRender(() => this.run());
  }

  /** Runs the caller's `before` (e.g. logging out) and changes the route out of sight. */
  private async onCovered(): Promise<void> {
    const cover = this.transition.cover();
    if (!cover) return;
    try {
      await cover.before?.();
    } finally {
      this.router.navigateByUrl(cover.path, { replaceUrl: !!cover.before });
    }
  }

  private run(): void {
    const root = this.root().nativeElement;
    const brand = this.brand().nativeElement;
    const showBrand = () => brand.classList.add('smoke-brand-in');
    // Added on top of smoke-brand-in rather than replacing it, so the wrench finishes its turn
    // while the logo fades instead of snapping back mid-swing.
    const hideBrand = () => brand.classList.add('smoke-brand-out');
    const done = () => this.transition.end();
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !ctx) {
      this.plainFade(root, showBrand, done);
      return;
    }

    const W = innerWidth;
    const H = innerHeight;
    const S = Math.max(W, H);
    // Full sharpness on ordinary screens; capped on huge ones so each fill stays cheap.
    const dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(5e6 / (W * H)));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const truck = this.truck().nativeElement;
    const tw = truck.offsetWidth;
    const th = (tw * TRUCK_H) / TRUCK_W;
    const truckTop = H * 0.8 - th;
    const startX = -tw * 1.1;
    const endX = W + tw * 0.15;
    const truckX = (t: number) => lerp(startX, endX, driveEase(clamp01(t / DRIVE)));
    const exhaustY = truckTop + th * EXHAUST.y;

    const puffs: Puff[] = [];
    const gap = Math.min(40, Math.max(18, S / 42));
    let nextPuffX = startX + tw * EXHAUST.x;
    let emitted = 0;
    const blank = { x: 0, y: 0, r: 0, delay: 0, dur: 1, wx: 0, wy: 0 };

    const exhaustPuff = (x: number, born: number) => {
      // Golden-ratio steps (jittered) spread where the puffs end up evenly between the road and
      // the top of the screen, so the cloud fills in without leaving a clear patch.
      const q = (emitted++ * 0.618034 + rand(0, 0.2)) % 1;
      const rise = lerp(-0.25, 0.95, q);
      const y = exhaustY + rand(-2, 2);
      puffs.push({
        ...blank,
        x0: x,
        y0: y,
        x1: x - rand(0, 0.07) * S,
        y1: y - rise * y,
        r0: th * 0.06,
        r1: S * rand(0.12, 0.21),
        born,
        grow: rand(550, 800),
      });
    };

    // A jittered grid of puffs over the whole screen, sized so that together they cover it,
    // plus a smaller one dropped anywhere in each cell so the result doesn't look like a grid.
    // They're what the cloud breaks up into, so it clears as puffs rather than a fading sheet.
    const fillPuffs = (born: number) => {
      const step = S * 0.16;
      const add = (x: number, y: number, r1: number) => puffs.push({ ...blank, x0: x, y0: y, x1: x, y1: y, r0: 0, r1, born, grow: 320 });
      for (let gy = 0; gy < H + step; gy += step) {
        for (let gx = 0; gx < W + step; gx += step) {
          add(gx + rand(-0.08, 0.08) * step, gy + rand(-0.08, 0.08) * step, step * rand(0.95, 1.25));
          add(gx + rand(-0.5, 0.5) * step, gy + rand(-0.5, 0.5) * step, step * rand(0.45, 0.85));
        }
      }
    };

    // A flat sheet behind the puffs that guarantees the cover. It trails the truck as a
    // soft-edged front, slanted to lag further behind up top, where the smoke arrives last, and
    // is solid from the moment the page is covered until the cloud starts to clear.
    const SLANT = 0.6;
    const ahead = { x: 1 / Math.hypot(1, SLANT), y: -SLANT / Math.hypot(1, SLANT) };
    const feather = W * 0.25;
    const frontEnd = W + SLANT * H + feather * 1.3;
    const drawSheet = (t: number) => {
      if (t >= COVERED) {
        ctx.fillStyle = `rgb(${BODY})`;
        ctx.fillRect(0, 0, W, H);
        return;
      }
      const front = lerp(-feather, frontEnd, easeIn(clamp01((t - 300) / (COVERED - 300))));
      if (front <= 0) return;
      const g = ctx.createLinearGradient(front - feather * ahead.x, H - feather * ahead.y, front, H);
      g.addColorStop(0, `rgba(${BODY}, 1)`);
      g.addColorStop(1, `rgba(${BODY}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    // One union fill of every puff, offset and scaled by its radius.
    const pass = (color: string, ox: number, oy: number, scale: number) => {
      ctx.beginPath();
      for (const p of puffs) {
        if (p.r < 0.5) continue;
        const r = p.r * scale;
        const x = p.x + p.r * ox;
        const y = p.y + p.r * oy;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Each puff blows off downwind, the leftmost (oldest) smoke first, and shrinks away.
    const startClearing = () => {
      for (const p of puffs) {
        p.delay = (0.36 * clamp01(p.x / W) + rand(0, 0.08)) * CLEAR;
        p.dur = rand(0.32, 0.5) * CLEAR;
        p.wx = S * rand(0.25, 0.5);
        p.wy = -S * rand(0.05, 0.2);
      }
    };

    const draw = (t: number, clearT: number | null) => {
      const wind = clearT == null ? 0 : (clearT / 1000) ** 2;
      for (const p of puffs) {
        const age = t - p.born;
        const move = easeOut(clamp01(age / (p.grow * 1.2)));
        p.x = lerp(p.x0, p.x1, move);
        p.y = lerp(p.y0, p.y1, move);
        p.r = age < 0 ? 0 : lerp(p.r0, p.r1, easeOut(clamp01(age / p.grow)));
        if (clearT != null) {
          p.x += p.wx * wind;
          p.y += p.wy * wind;
          p.r *= 1 - easeIn(clamp01((clearT - p.delay) / p.dur));
        }
      }
      ctx.clearRect(0, 0, W, H);
      if (clearT == null) drawSheet(t);
      pass(SHADE, 0.07, 0.11, 1);
      pass(`rgb(${BODY})`, 0, 0, 1);
      pass(LIGHT, -0.17, -0.21, 0.68);
    };

    let raf = 0;
    let t = 0;
    let last = 0;
    let lastExhaustX = nextPuffX;
    let covered = false;
    let clearing = false;
    const clearAt = COVERED + HOLD;

    const frame = (now: number) => {
      const prevT = t;
      if (last) t += Math.min(now - last, MAX_STEP);
      last = now;

      const x = truckX(t);
      truck.style.transform = `translate3d(${x}px, ${truckTop}px, 0)`;
      const exhaustX = x + tw * EXHAUST.x;
      const span = exhaustX - lastExhaustX;
      while (nextPuffX <= exhaustX && nextPuffX < W + S * 0.05) {
        // Born when the pipe passed this spot, between the last frame and this one, so puffs
        // dropped in the same frame don't all grow in lockstep.
        exhaustPuff(nextPuffX, span > 0 ? lerp(prevT, t, (nextPuffX - lastExhaustX) / span) : t);
        nextPuffX += gap * rand(0.8, 1.2);
      }
      lastExhaustX = exhaustX;
      if (t > DRIVE) truck.style.visibility = 'hidden';

      if (!covered && t >= COVERED) {
        covered = true;
        fillPuffs(t);
        showBrand();
        this.onCovered();
      }
      if (!clearing && t >= clearAt) {
        clearing = true;
        startClearing();
        hideBrand();
        // The new page is already showing through; let it take taps.
        root.style.pointerEvents = 'none';
      }

      draw(t, clearing ? t - clearAt : null);

      if (clearing && t - clearAt >= CLEAR) {
        done();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    this.destroyRef.onDestroy(() => cancelAnimationFrame(raf));
  }

  // Reduced motion: no truck and no drifting smoke, just a fade to the smoke colour and back.
  private plainFade(root: HTMLElement, showBrand: () => void, done: () => void): void {
    const fade = 200;
    root.style.background = `rgb(${BODY})`;
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade, fill: 'backwards' });
    const timers = [
      setTimeout(() => {
        showBrand();
        this.onCovered();
      }, fade),
      setTimeout(() => root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fade, fill: 'forwards' }), fade + HOLD),
      setTimeout(done, fade * 2 + HOLD),
    ];
    this.destroyRef.onDestroy(() => timers.forEach(clearTimeout));
  }
}

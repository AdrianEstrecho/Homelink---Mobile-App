import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';

// Ported from frontend/src/components/HeroSky.jsx: the hero's night sky — a twinkling starfield
// that brightens and joins into constellations around the pointer, plus the odd shooting star.
// The web lights it up under a hovering mouse; phones have no hover, so here a touch lights up
// the stars under the finger and the glow lingers a moment after it lifts, so a tap reads as
// "drawing" a constellation. It also publishes the eased pointer offset as --mx/--my (-1..1) on
// its parent for the hero's parallax layers. The canvas fades with the parent's --progress (CSS).

const STAR_DENSITY = 1 / 4200; // stars per px² of canvas (denser than the web's: a phone sky is small)
const MAX_STARS = 140;
const CURSOR_RADIUS = 120; // stars this close to the finger brighten...
const LINK_DISTANCE = 80; // ...and link up with neighbours this close
const MAX_LINKED = 22;
const STAR_PARALLAX = { x: 10, y: 6 }; // px of travel for the nearest stars
const LINGER_MS = 1400; // how long the glow stays after the finger lifts
const TAU = Math.PI * 2;

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  speed: number;
  phase: number;
  depth: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  ux: number;
  uy: number;
  speed: number;
  life: number;
  ttl: number;
  length: number;
}

function makeStars(width: number, height: number): Star[] {
  const count = Math.min(MAX_STARS, Math.round(width * height * STAR_DENSITY));
  return Array.from({ length: count }, () => {
    const tint = Math.random();
    return {
      x: Math.random() * width,
      // Denser near the top, thinning toward the horizon where the house and its glow take over.
      y: Math.pow(Math.random(), 1.5) * height * 0.8,
      r: 0.35 + Math.pow(Math.random(), 3) * 1.2,
      alpha: 0.25 + Math.random() * 0.6,
      speed: 0.6 + Math.random() * 1.8,
      phase: Math.random() * TAU,
      depth: 0.25 + Math.random() * 0.75,
      color: tint < 0.12 ? '255,226,190' : tint < 0.24 ? '200,220,255' : '255,255,255',
    };
  });
}

@Component({
  selector: 'app-hero-sky',
  template: '<canvas #canvas class="hero-stars" aria-hidden="true"></canvas>',
  host: { class: 'contents' },
  // Gone by about 80% of the parent's --progress, as the sky behind it brightens — dawn breaking.
  styles: `
    .hero-stars {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: calc(1 - var(--progress, 0) * 1.25);
    }
  `,
})
export class HeroSky {
  private host = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    const canvas = this.canvasRef().nativeElement;
    const pin = (this.host.nativeElement as HTMLElement).parentElement;
    const ctx = canvas.getContext('2d');
    if (!pin || !ctx) return;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let raf = 0;
    let last = 0;

    // Raw pointer (canvas px) and its eased followers.
    const pointer = { x: 0, y: 0, down: false, releasedAt: 0 };
    let glowX = 0;
    let glowY = 0;
    let presence = 0;
    let mx = 0;
    let my = 0;
    let writtenMx = 0;
    let writtenMy = 0;

    let shooting: ShootingStar | null = null;
    let nextShootAt = performance.now() + 2000 + Math.random() * 3000;

    const spawnShootingStar = () => {
      const dir = Math.random() < 0.5 ? 1 : -1;
      const angle = (16 + Math.random() * 18) * (Math.PI / 180);
      shooting = {
        x: width * (0.15 + Math.random() * 0.7),
        y: height * (0.04 + Math.random() * 0.3),
        ux: Math.cos(angle) * dir,
        uy: Math.sin(angle),
        speed: 520 + Math.random() * 220,
        life: 0,
        ttl: 0.7 + Math.random() * 0.4,
        length: 70 + Math.random() * 60,
      };
    };

    const drawShootingStar = (dt: number, now: number) => {
      if (!shooting) {
        if (now >= nextShootAt) spawnShootingStar();
        return;
      }
      const s = shooting;
      s.life += dt;
      s.x += s.ux * s.speed * dt;
      s.y += s.uy * s.speed * dt;
      if (s.life >= s.ttl) {
        shooting = null;
        nextShootAt = now + 5000 + Math.random() * 7000;
        return;
      }
      const fade = Math.sin((s.life / s.ttl) * Math.PI);
      const tailX = s.x - s.ux * s.length;
      const tailY = s.y - s.uy * s.length;
      const trail = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
      trail.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      trail.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    };

    const draw = (t: number, dt: number, now: number) => {
      ctx.clearRect(0, 0, width, height);
      const offX = -mx * STAR_PARALLAX.x;
      const offY = -my * STAR_PARALLAX.y;
      const lit = presence > 0.01;

      if (lit) {
        const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 180);
        glow.addColorStop(0, `rgba(150,190,255,${0.12 * presence})`);
        glow.addColorStop(1, 'rgba(150,190,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(glowX - 180, glowY - 180, 360, 360);
      }

      const linked: { x: number; y: number; pull: number }[] = [];
      for (const s of stars) {
        const x = s.x + offX * s.depth;
        const y = s.y + offY * s.depth;
        let a = reduceMotion ? s.alpha : s.alpha * (0.6 + 0.4 * Math.sin(t * s.speed + s.phase));
        let r = s.r;
        if (lit) {
          const d = Math.hypot(x - glowX, y - glowY);
          if (d < CURSOR_RADIUS) {
            const pull = (1 - d / CURSOR_RADIUS) * presence;
            a = Math.min(1, a + pull * 0.7);
            r += pull * 0.9;
            if (linked.length < MAX_LINKED) linked.push({ x, y, pull });
          }
        }
        if (r > 1.1) {
          ctx.fillStyle = `rgba(${s.color},${a * 0.15})`;
          ctx.beginPath();
          ctx.arc(x, y, r * 3, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${s.color},${a})`;
        if (r < 0.9) {
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
        }
      }

      if (linked.length > 1) {
        ctx.lineWidth = 0.75;
        for (let i = 0; i < linked.length; i++) {
          for (let j = i + 1; j < linked.length; j++) {
            const a = linked[i];
            const b = linked[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d >= LINK_DISTANCE) continue;
            ctx.strokeStyle = `rgba(190,215,255,${Math.min(1, (1 - d / LINK_DISTANCE) * Math.min(a.pull, b.pull) * 1.3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (!reduceMotion) drawShootingStar(dt, now);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const active = pointer.down || now - pointer.releasedAt < LINGER_MS;
      const ease = 1 - Math.exp(-dt * 5);
      const targetX = active ? Math.max(-1, Math.min(1, (pointer.x / width) * 2 - 1)) : 0;
      const targetY = active ? Math.max(-1, Math.min(1, (pointer.y / height) * 2 - 1)) : 0;
      mx += (targetX - mx) * ease;
      my += (targetY - my) * ease;
      presence += ((active ? 1 : 0) - presence) * ease;
      const follow = 1 - Math.exp(-dt * 12);
      glowX += (pointer.x - glowX) * follow;
      glowY += (pointer.y - glowY) * follow;
      // Only touch the custom properties when they've visibly moved, so a resting sky doesn't
      // restyle the parallax layers every frame.
      if (Math.abs(mx - writtenMx) > 0.001 || Math.abs(my - writtenMy) > 0.001) {
        writtenMx = mx;
        writtenMy = my;
        pin.style.setProperty('--mx', mx.toFixed(3));
        pin.style.setProperty('--my', my.toFixed(3));
      }

      draw(now / 1000, dt, now);
    };

    const startLoop = () => {
      if (reduceMotion || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(width, height);
      // Without the loop (reduced motion) the sky is painted once per size.
      if (!raf) draw(0, 0, performance.now());
    };

    const place = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onPointerDown = (e: PointerEvent) => {
      // Buttons, links and the search field sit on the sky; touching those isn't stargazing.
      if ((e.target as HTMLElement).closest('a, button, input, form')) return;
      place(e);
      // Start the glow at the finger rather than sweeping in from wherever it last was.
      glowX = pointer.x;
      glowY = pointer.y;
      pointer.down = true;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointer.down) place(e);
    };
    const onPointerUp = () => {
      if (!pointer.down) return;
      pointer.down = false;
      pointer.releasedAt = performance.now();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    // The loop only runs while the hero is on screen.
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) startLoop();
      else stopLoop();
    });
    visibilityObserver.observe(canvas);
    if (!reduceMotion) {
      pin.addEventListener('pointerdown', onPointerDown, { passive: true });
      pin.addEventListener('pointermove', onPointerMove, { passive: true });
      // A vertical drag turns into a page scroll, which cancels the pointer.
      pin.addEventListener('pointerup', onPointerUp);
      pin.addEventListener('pointercancel', onPointerUp);
      pin.addEventListener('pointerleave', onPointerUp);
    }

    this.destroyRef.onDestroy(() => {
      stopLoop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      pin.removeEventListener('pointerdown', onPointerDown);
      pin.removeEventListener('pointermove', onPointerMove);
      pin.removeEventListener('pointerup', onPointerUp);
      pin.removeEventListener('pointercancel', onPointerUp);
      pin.removeEventListener('pointerleave', onPointerUp);
    });
  }
}

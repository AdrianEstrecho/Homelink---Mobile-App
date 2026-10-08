import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { LucideGauge, LucideHand } from '@lucide/angular';

import { DeliveryTruck, TRUCK_SIZE, TRUCK_WHEELS, TRUCK_WHEEL_R, TRUCK_WHEEL_Y } from '../delivery-truck/delivery-truck';

// Ported from frontend/src/components/DeliveryLane.jsx: the HomeLink truck driving along the
// road under the Developers page header, left to right on a loop. It can be dragged along the
// road (or flung, so it coasts before settling back to cruising speed) and tapped to honk.
//
// Position, speed and wheel spin are written straight onto the DOM each frame, so driving never
// runs change detection; only a honk does. The loop stops while the lane is scrolled out of
// view. With reduced motion the truck stays parked until someone moves it.

const CLOUDS = [
  { top: '8%', width: 120, duration: 70, delay: -12 },
  { top: '24%', width: 84, duration: 95, delay: -55 },
  { top: '2%', width: 100, duration: 120, delay: -90 },
];

// Faint city blocks along the horizon, tiled across the lane behind the road.
const SKYLINE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 100'><path fill='#0f2b5b' fill-opacity='.05' d='M0 100V62h18V44h16v24h14V30h20v26h14v-8h18v18h12V22h16v32h14v10h18V40h20v20h14V50h18v20h12V34h20v28h16V46h16v12h16V38h16v26h12v36z'/></svg>",
)}")`;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// "Beep beep": two short blasts of a two-tone car horn, synthesised with Web Audio so there's no
// sound file to ship. The audio context is made on the first honk, since browsers only let sound
// start from a tap, and reused after that.
let audioCtx: AudioContext | null = null;
function playHorn(): void {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const ctx = audioCtx;

  const volume = ctx.createGain();
  volume.gain.value = 0.12;
  const muffle = ctx.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 1800;
  muffle.connect(volume);
  volume.connect(ctx.destination);

  const start = ctx.currentTime + 0.01;
  [0, 0.24].forEach((offset) => {
    const t = start + offset;
    const blast = ctx.createGain();
    blast.gain.setValueAtTime(0, t);
    blast.gain.linearRampToValueAtTime(1, t + 0.015);
    blast.gain.setValueAtTime(1, t + 0.15);
    blast.gain.linearRampToValueAtTime(0, t + 0.18);
    blast.connect(muffle);
    // Two notes a major third apart, the classic car-horn chord.
    [415, 523].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(blast);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  });
}

@Component({
  selector: 'app-delivery-lane',
  imports: [DeliveryTruck, LucideGauge, LucideHand],
  templateUrl: './delivery-lane.html',
})
export class DeliveryLane {
  private destroyRef = inject(DestroyRef);

  protected readonly clouds = CLOUDS;
  protected readonly skyline = SKYLINE;
  protected readonly truckViewBox = `0 0 ${TRUCK_SIZE[0]} ${TRUCK_SIZE[1]}`;
  protected readonly honks = signal(0);

  private readonly lane = viewChild.required<ElementRef<HTMLElement>>('lane');
  private readonly truck = viewChild.required<ElementRef<HTMLElement>>('truck');
  private readonly lean = viewChild.required<ElementRef<HTMLElement>>('lean');
  private readonly hop = viewChild.required<ElementRef<HTMLElement>>('hop');
  private readonly speed = viewChild.required<ElementRef<HTMLElement>>('speed');

  private readonly sim = {
    x: null as number | null,
    drawnX: 0,
    v: 0,
    cruise: 0,
    angle: 0,
    lean: 0,
    width: 0,
    truckW: 0,
    dragging: false,
    moved: false,
    grab: 0,
    startPX: 0,
    lastPX: 0,
    lastPT: 0,
  };

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    const lane = this.lane().nativeElement;
    const truck = this.truck().nativeElement;
    const leanEl = this.lean().nativeElement;
    const speedEl = this.speed().nativeElement;
    const wheels = Array.from(truck.querySelectorAll<SVGGElement>('.truck-wheel'));
    const s = this.sim;
    const reduce = reducedMotion();

    const measure = () => {
      s.width = lane.getBoundingClientRect().width;
      s.truckW = truck.offsetWidth;
      s.cruise = reduce ? 0 : clamp(s.width / 10, 40, 150);
      if (s.x === null) {
        s.x = s.drawnX = s.width * 0.08;
        s.v = s.cruise;
      }
    };

    const step = (dt: number) => {
      const x = s.x ?? 0;
      if (s.dragging) {
        // Holding still while grabbed bleeds off the fling, so letting go doesn't launch it.
        s.v *= Math.exp(-dt * 10);
      } else {
        s.v += (s.cruise - s.v) * (1 - Math.exp(-dt * 1.6));
        let next = x + s.v * dt;
        if (next > s.width) next = -s.truckW;
        else if (next < -s.truckW) next = s.width;
        s.x = next;
      }
      const dx = (s.x ?? 0) - s.drawnX;
      if (Math.abs(dx) < s.width / 2) {
        // Not the jump from wrapping around.
        const wheelPx = TRUCK_WHEEL_R * (s.truckW / TRUCK_SIZE[0]);
        s.angle = (s.angle + (dx / wheelPx) * (180 / Math.PI)) % 360;
      }
      s.drawnX = s.x ?? 0;
      // Nose lifts when it's going faster than cruising, dips when it's dragged backwards.
      const target = clamp(-(s.v - s.cruise) / 160, -4, 4);
      s.lean += (target - s.lean) * (1 - Math.exp(-dt * 8));
    };

    let lastSpeed = -1;
    const draw = () => {
      truck.style.transform = `translate3d(${s.x}px,0,0)`;
      leanEl.style.transform = `rotate(${s.lean}deg)`;
      wheels.forEach((w, i) => w.setAttribute('transform', `rotate(${s.angle} ${TRUCK_WHEELS[i]} ${TRUCK_WHEEL_Y})`));
      // A made-up km/h for the speedometer: cruising reads about 13-40 depending on the screen.
      const speed = Math.min(199, Math.round(Math.abs(s.v) / 3));
      if (speed !== lastSpeed) {
        lastSpeed = speed;
        speedEl.textContent = String(speed);
      }
    };

    let raf = 0;
    let last = 0;
    let running = false;
    const loop = (t: number) => {
      step(last ? Math.min(0.05, (t - last) / 1000) : 0);
      last = t;
      draw();
      if (running) raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    measure();
    draw();
    const ro = new ResizeObserver(measure);
    ro.observe(lane);
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()));
    io.observe(lane);
    this.destroyRef.onDestroy(() => {
      stopLoop();
      ro.disconnect();
      io.disconnect();
    });
  }

  private honk(): void {
    this.honks.update((n) => n + 1);
    playHorn();
    if (reducedMotion()) return;
    this.sim.v += 200;
    this.hop().nativeElement.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.4 }, { transform: 'translateY(0)' }],
      { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' },
    );
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const s = this.sim;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    s.dragging = true;
    s.moved = false;
    s.v = 0;
    s.grab = e.clientX - (s.x ?? 0);
    s.startPX = s.lastPX = e.clientX;
    s.lastPT = e.timeStamp;
  }

  onPointerMove(e: PointerEvent): void {
    const s = this.sim;
    if (!s.dragging) return;
    if (Math.abs(e.clientX - s.startPX) > 4) s.moved = true;
    const dt = Math.max(1, e.timeStamp - s.lastPT) / 1000;
    s.v = s.v * 0.6 + ((e.clientX - s.lastPX) / dt) * 0.4;
    s.lastPX = e.clientX;
    s.lastPT = e.timeStamp;
    s.x = clamp(e.clientX - s.grab, -s.truckW * 0.6, s.width - s.truckW * 0.4);
  }

  endDrag(): void {
    const s = this.sim;
    if (!s.dragging) return;
    s.dragging = false;
    s.v = clamp(s.v, -1600, 1600);
  }

  // A tap that ended a drag isn't a honk.
  onClick(): void {
    if (!this.sim.moved) this.honk();
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    this.sim.v += e.key === 'ArrowRight' ? 320 : -320;
  }
}

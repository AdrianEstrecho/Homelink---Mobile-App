import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild, viewChildren } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideHand, LucideRotateCcw, LucideShoppingBag, LucideSparkles, LucideWrench } from '@lucide/angular';

import { DeliveryTruck } from '../delivery-truck/delivery-truck';
import { HB_BY_ID, HB_PRODUCTS, HbProduct } from './home-builder.data';
import { HbHouse, treeShape } from './hb-house';
import { HbProductArt, HbProductId } from './hb-product-art';

const IDLE_MS = 5000;

// The truck's shelf compartments (truck coordinates, 440x270 with the wheels touching y=262),
// filled in HB_PRODUCTS order: top shelf left to right, then the bottom shelf.
const CELLS: [number, number, number, number][] = [
  [22, 48, 86, 68], [112, 48, 87, 68], [203, 48, 87, 68],
  [22, 125, 86, 64], [112, 125, 87, 64], [203, 125, 87, 64],
];

// The web's narrow-screen composition: house above, truck parked on the road below, and the
// handyman's head with his message on the lawn between the two. Bands are the tops of the
// lawn, sidewalk and road. (The web's side-by-side layout is for wide screens only.)
const L = {
  w: 480,
  h: 760,
  house: { x: 0, y: 6, s: 1 },
  truck: { x: 22, y: 468, s: 1 },
  sun: [436, 36] as [number, number],
  hills: [300, 326] as [number, number],
  grass: 350,
  walk: 470,
  road: 482,
};
type Origin = { x: number; y: number; s: number };

const READY = 'Drag a product from the truck onto the house!';
const DONE = 'Every product is in. This home is fully HomeLinked!';

const CONFETTI = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  return {
    dx: Math.cos(a) * (70 + (i % 3) * 30),
    dy: Math.sin(a) * (55 + (i % 4) * 20) - 24,
    rot: (i * 97) % 360,
    color: ['#ff6b35', '#00a896', '#1a4a8a', '#ffd27a'][i % 4],
    delay: (i % 5) * 40,
  };
});

type Tone = 'info' | 'success' | 'error';
type SlotTone = 'idle' | 'ready' | 'good' | 'bad';
const HEADS: Record<Tone, string> = { info: 'hi-head', success: 'answer-head', error: 'thinking-head' };

const SLOT_TONES: Record<SlotTone, string> = {
  idle: 'border-white/90 bg-white/25',
  ready: 'border-brand-orange bg-brand-orange/15',
  good: 'border-brand-teal bg-brand-teal/25 shadow-[0_0_0_4px_rgba(0,168,150,0.25)]',
  bad: 'border-red-500 bg-red-500/20',
};
const LABEL_TONES: Record<SlotTone, string> = {
  idle: 'bg-white text-brand-navy',
  ready: 'bg-brand-orange text-white',
  good: 'bg-brand-teal text-white',
  bad: 'bg-red-500 text-white',
};
const BUBBLE_TONES: Record<Tone, string> = { info: 'border-white', success: 'border-brand-teal', error: 'border-red-400' };
const GHOST_RINGS: Record<SlotTone, string> = { idle: 'ring-brand-orange/60', ready: 'ring-brand-orange/60', good: 'ring-brand-teal', bad: 'ring-red-500' };

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A rectangle in a part's own coordinates, as percentages of the whole scene. */
function place(origin: Origin, [x, y, w, h]: [number, number, number, number]) {
  return {
    left: `${((origin.x + x * origin.s) / L.w) * 100}%`,
    top: `${((origin.y + y * origin.s) / L.h) * 100}%`,
    width: `${((w * origin.s) / L.w) * 100}%`,
    height: `${((h * origin.s) / L.h) * 100}%`,
  };
}

// Ground bands and hills run past both edges of the scene.
const X0 = -480;
const X1 = L.w + 480;
function hill(top: number, phase: number): string {
  let d = `M${X0} ${top + 18}`;
  for (let x = X0; x < X1; x += 320) d += `Q${x + 160} ${top - 26 + ((x / 320 + phase) % 2) * 18} ${x + 320} ${top + 18}`;
  return `${d}L${X1} ${L.grass + 20}L${X0} ${L.grass + 20}Z`;
}
const JOINTS = Array.from({ length: Math.ceil((X1 - X0) / 44) }, (_, i) => `M${X0 + i * 44} ${L.walk}v${L.road - L.walk}`).join('');
const LANE_Y = L.road + (L.h - L.road) * 0.9;
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => `rotate(${i * 45} ${L.sun[0]} ${L.sun[1]})`);
const CLOUDS = [
  { y: 30, s: 1, dur: 80, delay: -10 },
  { y: 8, s: 0.7, dur: 110, delay: -60 },
  { y: 64, s: 0.8, dur: 140, delay: -100 },
];

interface Drag {
  id: HbProductId;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
}

interface Flight {
  id: HbProductId;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

let uidCounter = 0;

/**
 * Ported from frontend/src/components/HomeBuilder.jsx — "Kit out a HomeLink home": a street
 * scene with a cut-away house and a HomeLink delivery truck parked out front, its side rolled up
 * and six products on the shelves. Drag a product from the truck onto the house (or tap it, then
 * tap a spot). The right spot glows green and the product snaps in and its room comes to life; a
 * wrong spot glows red. The HomeLink handyman reacts to every move in a speech bubble. Leave it
 * alone for IDLE_MS and a demo takes over, carrying the remaining products in one by one —
 * touching anything hands control straight back.
 *
 * The scene is one SVG; drop spots and the truck's products are HTML buttons laid over it at the
 * same coordinates, which keeps hit-testing, focus and labels simple.
 */
@Component({
  selector: 'app-home-builder',
  imports: [NgTemplateOutlet, RouterLink, DeliveryTruck, HbHouse, HbProductArt, LucideCheck, LucideHand, LucideRotateCcw, LucideShoppingBag, LucideSparkles, LucideWrench],
  templateUrl: './home-builder.html',
  styleUrl: './home-builder.css',
})
export class HomeBuilder {
  private destroyRef = inject(DestroyRef);

  protected readonly uid = `hb${++uidCounter}`;
  protected readonly L = L;
  protected readonly products = HB_PRODUCTS;
  protected readonly cells = CELLS.map((c) => place(L.truck, c));
  protected readonly slots = HB_PRODUCTS.map((p) => place(L.house, p.hit));
  protected readonly houseCenter = place(L.house, [240, 220, 0, 0]);
  protected readonly confetti = CONFETTI;
  protected readonly heads = HEADS;
  protected readonly slotTones = SLOT_TONES;
  protected readonly labelTones = LABEL_TONES;
  protected readonly bubbleTones = BUBBLE_TONES;
  protected readonly scene = {
    hillBack: hill(L.hills[0], 0),
    hillFront: hill(L.hills[1], 1),
    joints: JOINTS,
    laneY: LANE_Y,
    sunRays: SUN_RAYS,
    clouds: CLOUDS,
    x0: X0,
    width: X1 - X0,
    houseTransform: `translate(${L.house.x} ${L.house.y}) scale(${L.house.s})`,
    truckTransform: `translate(${L.truck.x} ${L.truck.y}) scale(${L.truck.s})`,
  };
  protected readonly tree = treeShape(34, L.walk, 96);

  protected readonly installed = signal<Partial<Record<HbProductId, boolean>>>({});
  protected readonly selected = signal<HbProductId | null>(null);
  protected readonly dragId = signal<HbProductId | null>(null);
  protected readonly over = signal<HbProductId | null>(null);
  protected readonly flash = signal<HbProductId | null>(null);
  protected readonly flight = signal<Flight | null>(null);
  protected readonly demo = signal(false);
  protected readonly round = signal(0);
  protected readonly message = signal<{ tone: Tone; text: string; key: number }>({ tone: 'info', text: READY, key: 0 });

  protected readonly count = computed(() => HB_PRODUCTS.filter((p) => this.installed()[p.id]).length);
  protected readonly complete = computed(() => this.count() === HB_PRODUCTS.length);
  protected readonly targeting = computed(() => !!(this.dragId() || this.selected() || this.flight()));

  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly ghost = viewChild<ElementRef<HTMLElement>>('ghost');
  private readonly flightEl = viewChild<ElementRef<HTMLElement>>('flightEl');
  private readonly itemEls = viewChildren<ElementRef<HTMLElement>>('item');
  private readonly slotEls = viewChildren<ElementRef<HTMLElement>>('slot');

  private drag: Drag | null = null;
  protected dragPos = { x: 0, y: 0 };
  private suppressClick = false;
  private flightAnim: Animation | null = null;
  private demoOn = false;
  private lastTouch = Date.now();
  private inView = false;
  private nextStepAt = 0;
  private completed = { at: 0, byDemo: false };

  constructor() {
    // The handyman's faces swap on every message; fetch them all up front so none flickers in.
    Object.values(HEADS).forEach((name) => {
      new Image().src = `/mascot/${name}.webp`;
    });
    afterNextRender(() => {
      const io = new IntersectionObserver(
        ([entry]) => {
          this.inView = entry.isIntersecting;
          if (entry.isIntersecting && !this.demoOn) this.lastTouch = Date.now();
        },
        { threshold: 0.35 },
      );
      io.observe(this.root().nativeElement);
      const timer = setInterval(() => this.tick(), 250);
      this.destroyRef.onDestroy(() => {
        io.disconnect();
        clearInterval(timer);
        this.flightAnim?.cancel();
      });
    });
  }

  private itemEl(id: HbProductId): HTMLElement | undefined {
    return this.itemEls().find((el) => el.nativeElement.dataset['id'] === id)?.nativeElement;
  }

  private slotEl(id: HbProductId): HTMLElement | undefined {
    return this.slotEls().find((el) => el.nativeElement.dataset['id'] === id)?.nativeElement;
  }

  protected say(tone: Tone, text: string): void {
    this.message.update((m) => ({ tone, text, key: m.key + 1 }));
  }

  private drop(id: HbProductId, slotId: HbProductId | null, auto = false): boolean {
    const product = HB_BY_ID[id];
    if (!slotId) {
      this.say('info', `Drop the ${product.noun} right onto the house.`);
      return false;
    }
    if (slotId !== id) {
      this.flash.set(slotId);
      setTimeout(() => this.flash.update((f) => (f === slotId ? null : f)), 700);
      this.itemEl(id)?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 380 },
      );
      this.say('error', `That spot is for the ${HB_BY_ID[slotId].noun}. ${product.hint}`);
      return false;
    }
    const next = { ...this.installed(), [id]: true };
    this.installed.set(next);
    if (HB_PRODUCTS.every((p) => next[p.id])) {
      this.completed = { at: Date.now(), byDemo: auto };
      this.round.update((r) => r + 1);
      this.say('success', DONE);
    } else {
      this.say('success', `${capitalize(product.noun)} installed: ${product.done}`);
    }
    return true;
  }

  reset(): void {
    this.installed.set({});
    this.selected.set(null);
    this.say('info', READY);
  }

  // Any press inside hands control back from the demo and restarts the idle clock.
  takeOver(): void {
    this.lastTouch = Date.now();
    if (this.flightAnim) {
      this.flightAnim.cancel();
      this.flightAnim = null;
      this.flight.set(null);
    }
    this.demoOn = false;
    this.demo.set(false);
  }

  private flyTo(id: HbProductId): void {
    const item = this.itemEl(id);
    const slot = this.slotEl(id);
    if (!item || !slot) return;
    if (reducedMotion()) {
      this.drop(id, id, true);
      this.nextStepAt = Date.now() + 1500;
      return;
    }
    const a = item.getBoundingClientRect();
    const b = slot.getBoundingClientRect();
    const flight: Flight = {
      id,
      from: { x: a.left + a.width / 2, y: a.top + a.height / 2 },
      to: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
    };
    this.flight.set(flight);
    // The demo's "hand": carries the product from the truck to its spot along a lifted arc.
    requestAnimationFrame(() => {
      const el = this.flightEl()?.nativeElement;
      if (!el || this.flight() !== flight) return;
      const { from, to } = flight;
      const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 60 };
      const at = (p: { x: number; y: number }, s: number) => `translate(${p.x}px, ${p.y}px) scale(${s})`;
      const anim = el.animate(
        [
          { transform: at(from, 0.7), opacity: 0 },
          { transform: at(from, 1), opacity: 1, offset: 0.12 },
          { transform: at(mid, 1.08), opacity: 1, offset: 0.55 },
          { transform: at(to, 0.92), opacity: 1 },
        ],
        { duration: 1400, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' },
      );
      this.flightAnim = anim;
      anim.onfinish = () => {
        this.flightAnim = null;
        this.flight.set(null);
        this.drop(id, id, true);
        this.nextStepAt = Date.now() + 1100;
      };
    });
  }

  // The demo's clock: once the scene has sat in view, untouched, for IDLE_MS, install whatever's
  // left one product at a time; when it's all in, hold the finished house a moment and start over.
  private tick(): void {
    if (!this.inView || this.drag || this.flightAnim || this.flight()) return;
    const now = Date.now();
    if (now - this.lastTouch < IDLE_MS) return;
    if (!this.demoOn) {
      this.demoOn = true;
      this.demo.set(true);
      this.selected.set(null);
      this.nextStepAt = now;
    }
    if (now < this.nextStepAt) return;
    const left = HB_PRODUCTS.find((p) => !this.installed()[p.id]);
    if (left) {
      this.flyTo(left.id);
    } else if (now - this.completed.at > (this.completed.byDemo ? 3500 : 6000)) {
      this.reset();
      this.nextStepAt = now + 900;
    }
  }

  private hitSlot(x: number, y: number): HbProductId | null {
    let best: HbProductId | null = null;
    let bestDist = Infinity;
    for (const p of HB_PRODUCTS) {
      if (this.installed()[p.id]) continue;
      const r = this.slotEl(p.id)?.getBoundingClientRect();
      if (!r) continue;
      const pad = 14;
      if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) continue;
      const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = p.id;
      }
    }
    return best;
  }

  onItemDown(e: PointerEvent, id: HbProductId): void {
    if (e.button > 0 || this.installed()[id]) return;
    this.suppressClick = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.drag = { id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
  }

  onItemMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
      d.active = true;
      this.dragPos = { x: e.clientX, y: e.clientY };
      this.dragId.set(d.id);
      this.selected.set(null);
    }
    const ghost = this.ghost()?.nativeElement;
    if (ghost) ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const hit = this.hitSlot(e.clientX, e.clientY);
    if (this.over() !== hit) this.over.set(hit);
  }

  endDrag(e: PointerEvent, cancelled = false): void {
    const d = this.drag;
    this.drag = null;
    if (!d?.active) return;
    this.suppressClick = true;
    this.dragId.set(null);
    this.over.set(null);
    if (!cancelled) this.drop(d.id, this.hitSlot(e.clientX, e.clientY));
  }

  onItemClick(id: HbProductId): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (this.selected() === id) {
      this.selected.set(null);
      this.say('info', READY);
    } else {
      this.selected.set(id);
      this.say('info', `Now tap where the ${HB_BY_ID[id].noun} goes.`);
    }
  }

  onSlotClick(slotId: HbProductId): void {
    const selected = this.selected();
    if (!selected) {
      this.say('info', 'Pick a product from the truck first, then tap its spot on the house.');
      return;
    }
    if (this.drop(selected, slotId)) this.selected.set(null);
  }

  protected slotTone(p: HbProduct): SlotTone {
    const over = this.over();
    if (over === p.id) return this.dragId() === p.id ? 'good' : 'bad';
    if (this.flash() === p.id) return 'bad';
    return this.targeting() ? 'ready' : 'idle';
  }

  protected ghostTone(): SlotTone {
    const over = this.over();
    return over ? (over === this.dragId() ? 'good' : 'bad') : 'idle';
  }

  protected slotLabel(p: HbProduct, tone: SlotTone): string {
    return tone === 'good' ? 'Drop to install' : tone === 'bad' ? 'Not here' : p.spot;
  }

  protected slotAria(p: HbProduct): string {
    const selected = this.selected();
    return `${p.spot}: place ${selected ? `the ${HB_BY_ID[selected].noun}` : 'a product'} here`;
  }

  protected ghostRing(tone: SlotTone): string {
    return GHOST_RINGS[tone];
  }

  protected productName(id: HbProductId): string {
    return HB_BY_ID[id].name;
  }

  protected itemClass(id: HbProductId): string {
    const selected = this.selected() === id ? 'bg-brand-orange/15 ring-2 ring-brand-orange' : '';
    const away = this.dragId() === id || this.flight()?.id === id ? ' opacity-30' : '';
    return selected + away;
  }

  protected iconViewBox(id: HbProductId): string {
    const [w, h] = HB_BY_ID[id].box;
    const pad = 6;
    return `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`;
  }
}

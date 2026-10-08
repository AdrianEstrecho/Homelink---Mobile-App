import { HbProductId } from './hb-product-art';

export interface HbProduct {
  id: HbProductId;
  name: string;
  noun: string;
  spot: string;
  /** Where the installed artwork sits, in the house's own 480x400 space (ground at y=376). */
  at: [number, number];
  /** The artwork's own size. */
  box: [number, number];
  /** The roomier drop target over it: x, y, width, height. */
  hit: [number, number, number, number];
  /** The spot's label hangs from its left edge rather than its middle (near the scene's edge). */
  labelStart?: boolean;
  done: string;
  hint: string;
}

// Ported from frontend/src/components/HomeBuilder.jsx.
export const HB_PRODUCTS: HbProduct[] = [
  { id: 'solar', name: 'Solar Panels', noun: 'solar panels', spot: 'Roof', at: [236, 72], box: [120, 62], hit: [230, 66, 132, 74], done: 'free power from the sun.', hint: 'Solar panels go up on the roof, in the sun.' },
  { id: 'ac', name: 'Air Conditioner', noun: 'air conditioner', spot: 'Bedroom wall', at: [80, 172], box: [96, 34], hit: [76, 166, 104, 48], done: 'the bedroom is cooling down.', hint: 'The aircon goes high on the bedroom wall.' },
  { id: 'heater', name: 'Water Heater', noun: 'water heater', spot: 'Bathroom wall', at: [360, 176], box: [40, 74], hit: [350, 172, 60, 82], done: 'hot showers are on.', hint: 'The water heater goes in the bathroom, next to the shower.' },
  { id: 'bulb', name: 'Smart Bulb', noun: 'smart bulb', spot: 'Ceiling', at: [138, 272], box: [30, 48], hit: [120, 272, 66, 60], done: 'the living room lights up.', hint: 'The smart bulb hangs from the living room ceiling.' },
  { id: 'lock', name: 'Smart Lock', noun: 'smart lock', spot: 'Front door', at: [326, 316], box: [22, 34], hit: [306, 302, 62, 62], done: 'the front door is secured.', hint: 'The smart lock goes on the front door.' },
  { id: 'cctv', name: 'CCTV Camera', noun: 'CCTV camera', spot: 'Outside corner', at: [14, 158], box: [46, 28], hit: [4, 144, 64, 52], labelStart: true, done: 'the yard is being watched.', hint: 'The CCTV camera mounts outside, just under the roof.' },
];

export const HB_BY_ID = Object.fromEntries(HB_PRODUCTS.map((p) => [p.id, p])) as Record<HbProductId, HbProduct>;

import { Injectable, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { setCurrency } from './format.util';

/** Currency, shipping, VAT and delivery estimate from Platform Settings (GET /promos/storefront). */
export interface StorefrontSettings {
  currencyCode: string;
  currencySymbol: string;
  /** VAT rate, already included in product prices and the shipping fee. */
  taxRate: number;
  shippingFee: number;
  /** 0 means there is no threshold: the flat fee always applies. */
  freeShippingThreshold: number;
  deliveryEstimate: string;
}

// Matches the backend's SETTINGS_DEFAULTS, which is what an unconfigured store charges.
const DEFAULTS: StorefrontSettings = {
  currencyCode: 'PHP',
  currencySymbol: '₱',
  taxRate: 0,
  shippingFee: 0,
  freeShippingThreshold: 0,
  deliveryEstimate: '3-5 business days',
};

// The last visit's copy, so prices show the right symbol on the first paint instead of flipping
// once the request lands, which can take most of a minute while the free Render backend wakes.
const CACHE_KEY = 'homelink_storefront_settings';

function readCache(): StorefrontSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

/** Ported from frontend/src/context/SiteSettingsContext.jsx. Loaded once at boot by App. */
@Injectable({ providedIn: 'root' })
export class SiteSettingsService {
  private api = inject(ApiService);

  readonly settings = signal<StorefrontSettings>(readCache());

  constructor() {
    const initial = this.settings();
    setCurrency({ symbol: initial.currencySymbol, code: initial.currencyCode });
    this.api
      .get<Partial<StorefrontSettings>>('/promos/storefront')
      .then((fresh) => {
        const next = { ...DEFAULTS, ...fresh };
        setCurrency({ symbol: next.currencySymbol, code: next.currencyCode });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          /* private mode */
        }
        this.settings.set(next);
      })
      .catch(() => {});
  }
}

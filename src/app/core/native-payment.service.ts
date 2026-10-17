import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
// Capacitor plugins stay plain static imports and are never returned through a Promise: a
// plugin proxy resolved by a Promise gets probed for .then(), and Capacitor's proxy throws
// "Browser.then() is not implemented on android" (found on-device, invisible in ng serve).
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

/** The APK's own deep-link scheme (AndroidManifest.xml's VIEW intent filter). */
const APP_SCHEME = 'com.homelink.mobile://';

/** How often PayMongo is asked while its page is open, and once the customer is back. */
const POLL_MS = 3000;
const BACK_POLL_MS = 1500;
/** Back in the app without a confirmed payment: keep asking this long before calling it unpaid. */
const BACK_GRACE_MS = 8000;
/** PayMongo's hosted page stays usable a long time; give up only after this. */
const MAX_WAIT_MS = 30 * 60 * 1000;

export interface PaymentStatusResponse<T> {
  status: 'processing' | 'succeeded' | 'failed';
  error?: string;
  result?: T;
}

export type NativePaymentOutcome<T> =
  | { status: 'succeeded'; result: T }
  | { status: 'failed'; error?: string }
  /** Back in the app (tab closed, or PayMongo's cancel link) with nothing paid. */
  | { status: 'unpaid' };

const sleep = (ms: number, wake: { fn?: () => void }) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    wake.fn = () => {
      clearTimeout(t);
      resolve();
    };
  });

/** 'com.homelink.mobile://checkout/return?pcid=1' -> '/checkout/return?pcid=1'; null for anything else. */
export function appLinkPath(url: string): string | null {
  if (!url.startsWith(APP_SCHEME)) return null;
  const path = url.slice(APP_SCHEME.length).replace(/^\/+/, '');
  return path ? `/${path}` : '/';
}

/**
 * PayMongo's hosted checkout, run from the APK.
 *
 * The page opens in a Chrome Custom Tab (Google and most banks refuse to run inside our own
 * WebView), and the app keeps asking the backend's status endpoint underneath. Whichever
 * comes first ends it:
 * - the backend reports the payment paid (or failed): the tab is closed for the customer;
 * - PayMongo's success/cancel redirect, which the backend points at /api/app-return for the
 *   APK, reopens the app through com.homelink.mobile://...;
 * - the customer closes the tab themselves.
 * In the last two cases there's a short final check, so a payment that landed a moment
 * before still counts.
 *
 * A link that arrives with no checkout waiting (Android killed the app while PayMongo was
 * open) is routed to the matching screen instead, /checkout/return or /bookings/return,
 * which polls for itself.
 */
@Injectable({ providedIn: 'root' })
export class NativePaymentService {
  private router = inject(Router);
  private active: { back(cancelled: boolean): void } | null = null;
  /** When the last pay() ended: its own return link can trail it by a moment. */
  private finishedAt = 0;

  /** Called once at startup (App). */
  listenForAppLinks(): void {
    if (!Capacitor.isNativePlatform()) return;
    App.addListener('appUrlOpen', ({ url }) => this.onAppLink(url));
    App.getLaunchUrl()
      .then((launch) => launch?.url && this.onAppLink(launch.url))
      .catch(() => {});
  }

  private onAppLink(url: string): void {
    const path = appLinkPath(url);
    if (!path) return;
    if (this.active) {
      this.active.back(!path.split('?')[0].endsWith('/return'));
      return;
    }
    // The checkout that opened PayMongo already showed its result.
    if (Date.now() - this.finishedAt < 15000) return;
    this.router.navigateByUrl(path);
  }

  async pay<T>(checkoutUrl: string, checkStatus: () => Promise<PaymentStatusResponse<T>>): Promise<NativePaymentOutcome<T>> {
    const wake: { fn?: () => void } = {};
    let backAt = 0;
    let cancelled = false;
    const back = (wasCancelled: boolean) => {
      backAt ||= Date.now();
      cancelled ||= wasCancelled;
      wake.fn?.();
    };
    this.active = { back };

    const handles: PluginListenerHandle[] = [];
    try {
      await Browser.open({ url: checkoutUrl });
      handles.push(await Browser.addListener('browserFinished', () => back(false)));
      // The app only comes back to the front once the tab is gone.
      handles.push(await App.addListener('resume', () => back(false)));

      const startedAt = Date.now();
      for (;;) {
        try {
          const res = await checkStatus();
          if (res.status === 'succeeded' && res.result) return { status: 'succeeded', result: res.result };
          if (res.status === 'failed') return { status: 'failed', error: res.error };
        } catch {
          // A dropped request while the app sits behind the tab; the next round retries.
        }
        if (backAt && (cancelled || Date.now() - backAt >= BACK_GRACE_MS)) return { status: 'unpaid' };
        if (Date.now() - startedAt >= MAX_WAIT_MS) return { status: 'unpaid' };
        await sleep(backAt ? BACK_POLL_MS : POLL_MS, wake);
      }
    } finally {
      this.active = null;
      this.finishedAt = Date.now();
      handles.forEach((h) => h.remove());
      Browser.close().catch(() => {});
    }
  }
}

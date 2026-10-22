import { Injectable, computed, signal } from '@angular/core';

import { environment } from '../../environments/environment';

/** Ported from frontend/src/api/serverStatus.js. */
export type ServerStatusKind = 'offline' | 'down' | 'slow' | 'recovered';

// A request still waiting after this long is flagged as slow. Render's free instance sleeps after
// 15 idle minutes and takes up to a minute to wake, which looks exactly like a hang.
const SLOW_AFTER_MS = 10_000;
const HEALTH_TIMEOUT_MS = 20_000;
const RETRY_EVERY_MS = 10_000;
const RECOVERED_FOR_MS = 4_000;

/**
 * Whether the HomeLink API can be reached, for ServiceStatusBanner. Every request ApiService makes
 * reports here: how long it's taking, and whether it reached the server at all. The app keeps
 * running when the API on Render is asleep, restarting or swamped, so without this a customer
 * just sees spinners that never finish and buttons that do nothing.
 */
@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  readonly offline = signal(typeof navigator !== 'undefined' && navigator.onLine === false);
  readonly down = signal(false);
  readonly slow = signal(false);
  readonly recovered = signal(false);

  /** The one notice to show, most serious first. */
  readonly kind = computed<ServerStatusKind | null>(() =>
    this.offline() ? 'offline' : this.down() ? 'down' : this.slow() ? 'slow' : this.recovered() ? 'recovered' : null,
  );

  private slowCount = 0;
  private checking: Promise<boolean> | null = null;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private recoveredTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('offline', () => this.offline.set(true));
    window.addEventListener('online', () => {
      this.offline.set(false);
      if (this.down()) this.checkNow();
    });
  }

  /**
   * Call when a request starts; call the returned function once the server has answered (or the
   * request has failed). Requests that are slow by nature (the AI assistant) pass expectSlow.
   */
  trackRequest({ expectSlow = false }: { expectSlow?: boolean } = {}): () => void {
    if (expectSlow) return () => {};
    let counted = false;
    const timer = setTimeout(() => {
      counted = true;
      this.slowCount++;
      this.slow.set(true);
    }, SLOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      if (!counted) return;
      this.slowCount--;
      if (this.slowCount === 0) this.slow.set(false);
    };
  }

  /** Asks /health directly. Also the banner's "Try again" button. */
  checkNow(): Promise<boolean> {
    if (this.checking) return this.checking;
    this.checking = this.healthy()
      .then((ok) => {
        if (ok) this.markUp();
        else {
          this.down.set(true);
          this.recovered.set(false);
          if (!this.offline()) this.scheduleRetry();
        }
        return ok;
      })
      .finally(() => {
        this.checking = null;
      });
    return this.checking;
  }

  /** A request got an answer from the API, so it's up, whatever the answer said. */
  reportReachable(): void {
    if (this.down()) this.markUp();
  }

  /**
   * A request never reached the API (network error, or a gateway error page instead of our JSON).
   * One failure can be a blip on the phone's own connection, so /health gets asked before the
   * banner says the server is down.
   */
  reportUnreachable(): void {
    if (this.offline() || this.down()) return;
    this.checkNow();
  }

  // Plain fetch rather than HttpClient: it needs no token, and going through ApiService would
  // feed its own failure back into reportUnreachable.
  private async healthy(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const res = await fetch(`${environment.apiUrl}/health`, { cache: 'no-store', signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private markUp(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    if (!this.down()) return;
    this.down.set(false);
    this.recovered.set(true);
    clearTimeout(this.recoveredTimer);
    this.recoveredTimer = setTimeout(() => this.recovered.set(false), RECOVERED_FOR_MS);
  }

  private scheduleRetry(): void {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.checkNow(), RETRY_EVERY_MS);
  }
}

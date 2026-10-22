import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { ServerStatusService } from './server-status.service';

const UNREACHABLE_MESSAGE = "We can't reach HomeLink right now. Check your internet connection, then try again in a moment.";
const UNAVAILABLE_MESSAGE = 'HomeLink is temporarily unavailable. Please try again in a moment.';

/**
 * A class rather than a plain Error so GlobalErrorHandler can tell a failed request that nobody
 * caught (which shouldn't take the whole app down) from a real bug in the UI.
 */
export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    message: string,
    public code?: string,
    /** 0 when the request never reached the server. */
    public status = 0,
    /** The whole body, for errors that carry more than a message (e.g. wrong_portal's `portal`). */
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/**
 * The server couldn't be reached, or it answered but couldn't do the work right then (busy,
 * restarting, database unreachable). Says nothing about the request itself, so it's safe to try
 * the same thing again later.
 */
export function isTransientApiError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status >= 500);
}

export interface RequestOptions {
  /** For requests that are slow by nature (the AI assistant), so they don't raise the
   *  "taking longer than usual" banner. */
  expectSlow?: boolean;
}

/**
 * Mirrors frontend/src/api/client.js exactly: same base URL convention, same
 * Authorization header (added by authTokenInterceptor, not here), and the same
 * `err.message` / `err.code` shape on failure so ported pages can keep the
 * identical catch-block logic the React source uses.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private serverStatus = inject(ServerStatusService);
  private base = environment.apiUrl;
  // 'android'/'ios' from the APK, 'mobile' from the mobile web build.
  private client = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'mobile';

  get<T>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, opts);
  }

  post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, opts);
  }

  put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, opts);
  }

  delete<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, body, opts);
  }

  private async request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
    const answered = this.serverStatus.trackRequest(opts);
    let data: T;
    try {
      data = await firstValueFrom(
        // The native Capacitor WebView often sends no usable Origin header on cross-origin
        // requests, so the backend can't tell "this is the mobile app" from Origin alone
        // (see backend/utils/frontendUrl.js) -- this header is a reliable stand-in, used to
        // pick where PayMongo's hosted checkout redirects back to after payment (the APK gets
        // a page that reopens the app).
        this.http.request<T>(method, `${this.base}${path}`, { body, headers: { 'X-Homelink-Client': this.client } })
      );
    } catch (e) {
      answered();
      throw this.toApiError(e);
    }
    answered();
    this.serverStatus.reportReachable();
    return data;
  }

  private toApiError(e: unknown): unknown {
    if (!(e instanceof HttpErrorResponse)) return e;

    // Status 0: no response arrived at all -- offline, DNS, the server not answering, or a
    // CORS-blocked error page. Angular's own wording for that means nothing to a customer.
    if (e.status === 0) {
      this.serverStatus.reportUnreachable();
      return new ApiError(UNREACHABLE_MESSAGE, 'network');
    }

    // Every error the API itself sends is JSON. A 5xx that isn't came from whatever sits in front
    // of it (Render's proxy while the server restarts or is down), not from HomeLink.
    const data = e.error && typeof e.error === 'object' ? (e.error as Record<string, unknown>) : null;
    if (data === null && e.status >= 500) {
      this.serverStatus.reportUnreachable();
      return new ApiError(UNAVAILABLE_MESSAGE, 'unavailable', e.status);
    }

    this.serverStatus.reportReachable();
    const fallback = e.status >= 500 ? 'Something went wrong on our end. Please try again.' : 'Request failed';
    const message = typeof data?.['error'] === 'string' && data['error'] ? data['error'] : fallback;
    const code = typeof data?.['code'] === 'string' ? data['code'] : undefined;
    return new ApiError(message, code, e.status, data ?? {});
  }
}

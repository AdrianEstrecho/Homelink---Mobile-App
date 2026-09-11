import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export interface ApiError extends Error {
  code?: string;
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
  private base = environment.apiUrl;

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await firstValueFrom(
        // The native Capacitor WebView often sends no usable Origin header on cross-origin
        // requests, so the backend can't tell "this is the mobile app" from Origin alone
        // (see backend/utils/frontendUrl.js) -- this header is a reliable stand-in, used to
        // pick where PayMongo's hosted checkout redirects back to after payment.
        this.http.request<T>(method, `${this.base}${path}`, { body, headers: { 'X-Homelink-Client': 'mobile' } })
      );
    } catch (e) {
      const err = e as HttpErrorResponse;
      const data = (err.error ?? {}) as { error?: string; code?: string };
      const wrapped = new Error(data.error || 'Request failed') as ApiError;
      if (data.code) wrapped.code = data.code;
      throw wrapped;
    }
  }
}

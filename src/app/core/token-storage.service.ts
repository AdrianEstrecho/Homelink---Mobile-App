import { Injectable } from '@angular/core';

const TOKEN_KEY = 'homelink_token';

/**
 * Plain localStorage, same key as frontend/src/context/AuthContext.jsx. Android's
 * WebView persists localStorage across app restarts reliably, so this is enough
 * for now — @capacitor/preferences is only worth adding later as hardening.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}

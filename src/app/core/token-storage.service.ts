import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'homelink_token';

/**
 * Same key as frontend/src/context/AuthContext.jsx's localStorage entry, but
 * backed by @capacitor/preferences: native Android SharedPreferences instead
 * of the WebView's plain localStorage, with a transparent localStorage
 * fallback when running in a browser (ng serve).
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  async get(): Promise<string | null> {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  }

  async set(token: string): Promise<void> {
    await Preferences.set({ key: TOKEN_KEY, value: token });
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: TOKEN_KEY });
  }
}

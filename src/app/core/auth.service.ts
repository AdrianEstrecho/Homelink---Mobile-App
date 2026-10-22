import { Injectable, inject, signal } from '@angular/core';

import { ApiService, isTransientApiError } from './api.service';
import { TokenStorageService } from './token-storage.service';
import { User } from './user.model';

/** Backoff for restoring a saved session the server couldn't confirm at launch (~3.5 min in all). */
const SESSION_RETRY_DELAYS_MS = [5_000, 10_000, 20_000, 40_000, 60_000, 75_000];

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  acceptedTerms: boolean;
  /** From POST /auth/send-verification-code — the backend 400s registration without it. */
  code: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface Requires2FAResponse {
  requires2FA: true;
  email: string;
}

/** Login and Google sign-in can both come back asking for a 2FA code instead of a token —
 *  `requires2FA: true` with no `user` yet, or `requires2FA: false` with the real session. */
export type LoginResult = { requires2FA: true; email: string } | { requires2FA: false; user: User };

function isRequires2FA(data: AuthResponse | Requires2FAResponse): data is Requires2FAResponse {
  return (data as Requires2FAResponse).requires2FA === true;
}

/**
 * Ported from frontend/src/context/AuthContext.jsx. loginWithGoogle posts the
 * Google Identity Services ID token to the same /auth/google endpoint the web
 * app uses — see login.ts for where the credential comes from and why it's
 * web-only (native Android would need its own OAuth client + Capacitor
 * plugin, still deferred per the mobile port plan).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private tokens = inject(TokenStorageService);

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);

  /** Resolves once the bootstrap /auth/me check (if any) has settled. */
  readonly authReady: Promise<void>;

  constructor() {
    this.authReady = this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const token = await this.tokens.get();
    if (!token) {
      this.loading.set(false);
      return;
    }
    try {
      const user = await this.api.get<User>('/auth/me');
      this.user.set(user);
    } catch (err) {
      // Only a server that answered and turned the token away ends the session. A dropped
      // connection, a server still waking up or a database too busy to answer says nothing about
      // the token -- clearing it there signed a whole room out at once whenever the server
      // struggled, and every one of them signing back in only added to the load.
      if (isTransientApiError(err)) this.restoreSessionLater(token);
      else await this.tokens.clear();
    } finally {
      this.loading.set(false);
    }
  }

  /** Keeps retrying /auth/me in the background after a transient failure at launch, until it
   *  answers either way or the stored token changes (signed in or out meanwhile). */
  private async restoreSessionLater(token: string): Promise<void> {
    for (const delay of SESSION_RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (this.user() || (await this.tokens.get()) !== token) return;
      try {
        const user = await this.api.get<User>('/auth/me');
        if ((await this.tokens.get()) === token) this.user.set(user);
        return;
      } catch (err) {
        if (isTransientApiError(err)) continue;
        if ((await this.tokens.get()) === token) await this.tokens.clear();
        return;
      }
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    // Phone keyboards often leave a trailing space after autocompleting an address.
    const data = await this.api.post<AuthResponse | Requires2FAResponse>('/auth/login', { email: email.trim(), password });
    if (isRequires2FA(data)) return { requires2FA: true, email: data.email };
    await this.tokens.set(data.token);
    this.user.set(data.user);
    return { requires2FA: false, user: data.user };
  }

  /** Exchanges the code emailed by /login or /google (when either responded with
   *  `requires2FA: true`) for the real session — same account that request was for. */
  async verifyTwoFactor(email: string, code: string): Promise<User> {
    const data = await this.api.post<AuthResponse>('/auth/verify-2fa', { email, code });
    await this.tokens.set(data.token);
    this.user.set(data.user);
    return data.user;
  }

  /** `mode: 'login'` (used by the Login page) — the backend 404s with code `not_registered`
   *  rather than silently creating an account, so the caller can point the user at /register
   *  instead. Omitted (used by the Register page) — it creates the account if none exists yet. */
  async loginWithGoogle(credential: string, mode?: 'login'): Promise<LoginResult> {
    const data = await this.api.post<AuthResponse | Requires2FAResponse>('/auth/google', { credential, mode });
    if (isRequires2FA(data)) return { requires2FA: true, email: data.email };
    await this.tokens.set(data.token);
    this.user.set(data.user);
    return { requires2FA: false, user: data.user };
  }

  async register(form: RegisterForm): Promise<User> {
    const data = await this.api.post<AuthResponse>('/auth/register', form);
    await this.tokens.set(data.token);
    this.user.set(data.user);
    return data.user;
  }

  async logout(): Promise<void> {
    await this.tokens.clear();
    this.user.set(null);
  }

  async updateProfile(form: Partial<User>): Promise<void> {
    await this.api.put('/auth/profile', form);
    this.user.update((prev) => (prev ? { ...prev, ...form } : prev));
  }

  /** Emails the code that has to be entered before two-factor sign-in can be switched on. */
  sendTwoFactorSetupCode(): Promise<unknown> {
    return this.api.post('/auth/two-factor/send-code', {});
  }

  /** Mirrors setTwoFactorEnabled in frontend/src/context/AuthContext.jsx. Turning it on needs
   *  the emailed setup code; turning it off doesn't. */
  async setTwoFactorEnabled(enabled: boolean, code?: string): Promise<void> {
    const data = await this.api.put<{ twoFactorEnabled: boolean }>('/auth/two-factor', { enabled, code });
    this.user.update((prev) => (prev ? { ...prev, twoFactorEnabled: data.twoFactorEnabled } : prev));
  }

  /** A data URL to set the profile photo, or null to remove it. */
  async updateAvatar(avatar: string | null): Promise<void> {
    const data = await this.api.put<{ avatar: string | null }>('/auth/avatar', { avatar });
    this.user.update((prev) => (prev ? { ...prev, avatar: data.avatar } : prev));
  }

  async refreshUser(): Promise<User> {
    const data = await this.api.get<User>('/auth/me');
    this.user.set(data);
    return data;
  }
}

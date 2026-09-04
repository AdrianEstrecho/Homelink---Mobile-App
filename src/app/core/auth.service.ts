import { Injectable, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { TokenStorageService } from './token-storage.service';
import { User } from './user.model';

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  acceptedTerms: boolean;
}

interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Ported from frontend/src/context/AuthContext.jsx. loginWithGoogle is
 * intentionally not implemented yet — see the mobile port plan (Phase 2,
 * Google Sign-In deferral): it needs a native Capacitor plugin and the
 * user's own Android OAuth client credentials.
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
    } catch {
      await this.tokens.clear();
    } finally {
      this.loading.set(false);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const data = await this.api.post<AuthResponse>('/auth/login', { email, password });
    await this.tokens.set(data.token);
    this.user.set(data.user);
    return data.user;
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

  async refreshUser(): Promise<User> {
    const data = await this.api.get<User>('/auth/me');
    this.user.set(data);
    return data;
  }
}

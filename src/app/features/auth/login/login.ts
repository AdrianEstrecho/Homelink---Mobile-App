import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LucideLoaderCircle, LucideLogIn } from '@lucide/angular';

import { ApiError } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { User } from '../../../core/user.model';
import { AuthLayout } from '../../../shared/auth-layout/auth-layout';
import { GoogleSigninButton } from '../../../shared/google-signin-button/google-signin-button';
import { PasswordInput } from '../../../shared/password-input/password-input';

type Stage = 'credentials' | '2fa';

/**
 * Ported from frontend/src/pages/Login.jsx, including its 2-stage flow: /auth/login (and
 * /auth/google) can come back with `requires2FA: true` instead of a session for an account
 * that has email-code 2FA turned on, which this previously ignored outright (it just tried
 * to read `.token`/`.user` off that response and silently logged nobody in). Now it swaps to
 * a code-entry stage exactly like the web app, and resending works for either the
 * password or Google path that got there.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthLayout, GoogleSigninButton, PasswordInput, LucideLogIn, LucideLoaderCircle],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly googleError = signal('');
  protected readonly googleSupported = !Capacitor.isNativePlatform();

  protected readonly stage = signal<Stage>('credentials');
  protected code = '';
  protected readonly resent = signal(false);
  /** Set only when the pending 2FA challenge came from Google sign-in (no password on hand to
   *  resend with) — Google's ID token stays valid for reuse within its window. */
  private googleCredential: string | null = null;

  private finishLogin(user: User): void {
    if (user.role !== 'customer') {
      this.auth.logout();
      throw new Error("This account isn't a customer account. Please sign in via the HomeLink web portal.");
    }
    this.router.navigateByUrl('/');
  }

  async onSubmit(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.auth.login(this.email, this.password);
      if (result.requires2FA) {
        this.stage.set('2fa');
        this.loading.set(false);
        return;
      }
      this.finishLogin(result.user);
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }

  async onGoogleCredential(credential: string): Promise<void> {
    this.googleError.set('');
    this.loading.set(true);
    try {
      const result = await this.auth.loginWithGoogle(credential, 'login');
      if (result.requires2FA) {
        this.email = result.email;
        this.googleCredential = credential;
        this.stage.set('2fa');
        this.loading.set(false);
        return;
      }
      this.finishLogin(result.user);
    } catch (err) {
      const e = err as ApiError;
      this.googleError.set(
        e.code === 'not_registered' ? 'No HomeLink account found for this Google account — sign up first.' : e.message,
      );
      this.loading.set(false);
    }
  }

  async verify2fa(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const user = await this.auth.verifyTwoFactor(this.email, this.code);
      this.finishLogin(user);
    } catch (err) {
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }

  async resendCode(): Promise<void> {
    this.error.set('');
    this.resent.set(false);
    try {
      if (this.googleCredential) {
        await this.auth.loginWithGoogle(this.googleCredential, 'login');
      } else {
        await this.auth.login(this.email, this.password);
      }
      this.resent.set(true);
    } catch (err) {
      this.error.set((err as Error).message);
    }
  }

  backToCredentials(): void {
    this.stage.set('credentials');
    this.code = '';
    this.error.set('');
    this.resent.set(false);
    this.googleCredential = null;
  }

  onCodeInput(value: string): void {
    this.code = value.toUpperCase();
  }
}

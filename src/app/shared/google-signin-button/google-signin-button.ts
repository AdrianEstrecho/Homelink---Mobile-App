import { AfterViewInit, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { LucideLoaderCircle } from '@lucide/angular';

import { environment } from '../../../environments/environment';

declare const google: {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (resp: { credential: string }) => void }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

/** One initialize per app run — the plugin keeps its Google client around after that. */
let nativeInit: Promise<void> | null = null;

function initNativeGoogle(): Promise<void> {
  nativeInit ??= SocialLogin.initialize({ google: { webClientId: environment.googleClientId, mode: 'online' } }).catch((err) => {
    nativeInit = null;
    throw err;
  });
  return nativeInit;
}

/**
 * Google Sign-in/Sign-up, emitting the raw Google ID token on success. Callers (login.ts,
 * register.ts) post it to /auth/google through `AuthService.loginWithGoogle`, with or
 * without `mode: 'login'`.
 *
 * - Web: Google's official button, rendered by Google Identity Services (the script tag
 *   is in index.html).
 * - Native APK: Google blocks its OAuth pages inside embedded WebViews
 *   ("disallowed_useragent"), so the button opens Android's own Google account sheet
 *   instead (Credential Manager, via @capgo/capacitor-social-login). It asks for the
 *   Web client ID, so the ID token it returns has the same audience the backend already
 *   checks, and /auth/google needs no change. The Google Cloud project still needs an
 *   Android OAuth client for package com.homelink.mobile and the APK's signing SHA-1,
 *   or Google refuses the request ("Developer console is not set up correctly").
 */
@Component({
  selector: 'app-google-signin-button',
  imports: [LucideLoaderCircle],
  templateUrl: './google-signin-button.html',
  styleUrl: './google-signin-button.css',
})
export class GoogleSigninButton implements AfterViewInit {
  readonly text = input<'signin_with' | 'signup_with'>('signin_with');
  readonly credential = output<string>();
  /** Native only: why the account sheet didn't produce a token (not sent when the user just backs out). */
  readonly failed = output<string>();

  protected readonly native = Capacitor.isNativePlatform();
  protected readonly ready = signal(false);
  protected readonly busy = signal(false);
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('btn');

  ngAfterViewInit(): void {
    if (!this.native) this.initWeb();
  }

  protected async signInNative(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await initNativeGoogle();
      const res = await SocialLogin.login({ provider: 'google', options: {} });
      const idToken = res.result.responseType === 'online' ? res.result.idToken : null;
      if (!idToken) throw new Error('Google did not return an ID token.');
      this.credential.emit(idToken);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'USER_CANCELLED' || /cancel/i.test(e.message ?? '')) return;
      this.failed.emit(nativeErrorMessage(e.message ?? ''));
    } finally {
      this.busy.set(false);
    }
  }

  private initWeb(retriesLeft = 20): void {
    if (typeof google === 'undefined' || !google.accounts?.id) {
      if (retriesLeft <= 0) return;
      setTimeout(() => this.initWeb(retriesLeft - 1), 150);
      return;
    }
    const el = this.container()?.nativeElement;
    if (!el) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (resp) => this.credential.emit(resp.credential),
    });
    // Google's button API wants a fixed pixel width, not a percentage — measure the
    // container (sized by the page's own layout column) instead of hardcoding one, so
    // it doesn't overflow narrower phones.
    const width = Math.min(360, el.offsetWidth || 320);
    google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width, text: this.text() });
    this.ready.set(true);
  }
}

function nativeErrorMessage(raw: string): string {
  if (/no credentials|no account|NoCredential/i.test(raw)) {
    return 'No Google account is signed in on this phone. Add one in Settings, then try again.';
  }
  if (/28444|developer console|not set up/i.test(raw)) {
    return "Google sign-in isn't set up for this app build yet. Use your email and password for now.";
  }
  return 'Google sign-in failed. Please try again.';
}

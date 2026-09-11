import { AfterViewInit, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { environment } from '../../../environments/environment';

declare const google: {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (resp: { credential: string }) => void }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

/**
 * Renders Google's official Sign-in/Sign-up button via Google Identity
 * Services (script tag in index.html) and emits the raw ID-token credential
 * on success — callers (login.ts, register.ts) decide what to do with it
 * (`AuthService.loginWithGoogle`, with or without `mode: 'login'`).
 *
 * Web only. Hidden entirely inside the native Capacitor WebView: Google
 * blocks its OAuth consent screen for embedded webviews
 * ("disallowed_useragent"), so real native support needs its own Capacitor
 * plugin plus a separate Android OAuth client — still deferred per the
 * mobile port plan.
 */
@Component({
  selector: 'app-google-signin-button',
  imports: [],
  templateUrl: './google-signin-button.html',
  styleUrl: './google-signin-button.css',
})
export class GoogleSigninButton implements AfterViewInit {
  readonly text = input<'signin_with' | 'signup_with'>('signin_with');
  readonly credential = output<string>();

  protected readonly supported = !Capacitor.isNativePlatform();
  protected readonly ready = signal(false);
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('btn');

  ngAfterViewInit(): void {
    if (this.supported) this.init();
  }

  private init(retriesLeft = 20): void {
    if (typeof google === 'undefined' || !google.accounts?.id) {
      if (retriesLeft <= 0) return;
      setTimeout(() => this.init(retriesLeft - 1), 150);
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

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SplashScreen as NativeSplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LucideAlertOctagon } from '@lucide/angular';
import { filter, map } from 'rxjs/operators';

import { isChromelessRoute } from './core/shell-route.util';
import { AuthService } from './core/auth.service';
import { ErrorStateService } from './core/error-state.service';
import { Navbar } from './shared/navbar/navbar';
import { SideMenu } from './shared/side-menu/side-menu';
import { SplashScreen } from './shared/splash-screen/splash-screen';
import { ToastViewport } from './shared/toast-viewport/toast-viewport';

/** Floor for how long the branded splash stays up, so a warm start still reads as a launch. */
const SPLASH_MIN_MS = 1700;
/** Matches the .splash transition in splash-screen.css. */
const SPLASH_FADE_MS = 450;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, SideMenu, SplashScreen, ToastViewport, LucideAlertOctagon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly errorState = inject(ErrorStateService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected readonly splashVisible = signal(true);
  protected readonly splashLeaving = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  protected readonly showChrome = computed(() => !isChromelessRoute(this.url()));

  ngOnInit(): void {
    this.initStatusBar();
    this.runSplash();
  }

  private initStatusBar(): void {
    if (!Capacitor.isNativePlatform()) return;
    // Edge-to-edge: the webview draws behind the status bar and the shell's
    // own safe-area padding (see .app-topbar in styles.css) keeps content clear of it.
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0f2b5b' }).catch(() => {});
    // Dark navy background needs light (white) status bar icons/text.
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  }

  /**
   * Launch sequence. The native Capacitor splash holds the screen until
   * Angular has painted (capacitor.config.ts sets `launchAutoHide: false`, so
   * nothing hides it but us) — dismissing it a frame after our own splash is
   * on screen makes the handoff invisible, instead of flashing white webview
   * in between. Our splash then stays until both the session bootstrap has
   * settled and the minimum display time has passed, whichever is slower, so
   * a fast warm start doesn't blink the branding past the user.
   */
  private async runSplash(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      requestAnimationFrame(() => {
        NativeSplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
      });
    }

    const minimum = prefersReducedMotion() ? 500 : SPLASH_MIN_MS;
    await Promise.all([this.auth.authReady.catch(() => {}), wait(minimum)]);

    this.splashLeaving.set(true);
    await wait(SPLASH_FADE_MS);
    this.splashVisible.set(false);
  }

  reload(): void {
    window.location.reload();
  }
}

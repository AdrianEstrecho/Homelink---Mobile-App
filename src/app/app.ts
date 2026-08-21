import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LucideAlertOctagon } from '@lucide/angular';
import { filter, map } from 'rxjs/operators';

import { isChromelessRoute, isTabRoot } from './core/shell-route.util';
import { ErrorStateService } from './core/error-state.service';
import { BottomNav } from './shared/bottom-nav/bottom-nav';
import { Navbar } from './shared/navbar/navbar';
import { ToastViewport } from './shared/toast-viewport/toast-viewport';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, BottomNav, ToastViewport, LucideAlertOctagon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly errorState = inject(ErrorStateService);
  private router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  protected readonly showChrome = computed(() => !isChromelessRoute(this.url()));
  protected readonly showTabs = computed(() => this.showChrome() && isTabRoot(this.url()));

  ngOnInit(): void {
    if (!Capacitor.isNativePlatform()) return;
    // Edge-to-edge: the webview draws behind the status bar and the shell's
    // own safe-area padding (see .app-topbar in styles.css) keeps content clear of it.
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0f2b5b' }).catch(() => {});
    // Dark navy background needs light (white) status bar icons/text.
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  }

  reload(): void {
    window.location.reload();
  }
}

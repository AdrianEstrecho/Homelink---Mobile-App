import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { LucideCircleCheck, LucideCloudOff, LucideLoaderCircle, LucideRotateCw, LucideWifiOff } from '@lucide/angular';
import { filter, map } from 'rxjs/operators';

import { ServerStatusService, ServerStatusKind } from '../../core/server-status.service';
import { hasBottomBar, showsAssistant } from '../../core/shell-route.util';

interface Variant {
  tone: string;
  title: string;
  body: string;
  role: 'alert' | 'status';
}

const VARIANTS: Record<ServerStatusKind, Variant> = {
  offline: {
    tone: 'bg-gray-100 text-gray-600',
    title: "You're offline",
    body: 'Check your internet connection, then try again.',
    role: 'alert',
  },
  down: {
    tone: 'bg-red-50 text-red-500',
    title: 'HomeLink is temporarily unavailable',
    body: "We can't reach our server right now. The app will reconnect on its own as soon as it's back.",
    role: 'alert',
  },
  slow: {
    tone: 'bg-brand-orange/10 text-brand-orange',
    title: 'Taking longer than usual',
    body: 'The server may be waking up or busy. This can take up to a minute, so please keep the app open.',
    role: 'status',
  },
  recovered: {
    tone: 'bg-brand-teal/15 text-brand-teal',
    title: "You're back online",
    body: 'HomeLink is reachable again.',
    role: 'status',
  },
};

/**
 * Ported from frontend/src/components/ServiceStatusBanner.jsx: the app-wide notice for when
 * HomeLink's server can't be reached or is slow to answer (see core/server-status.service.ts).
 * Pinned to the bottom, clear of the toasts at the top; it stops short of the assistant mascot
 * on Home and, on detail pages, sits on top of the buy/book bar. Layered above
 * the launch splash too, since a cold server is exactly what keeps the splash up.
 */
@Component({
  selector: 'app-service-status-banner',
  imports: [LucideCircleCheck, LucideCloudOff, LucideLoaderCircle, LucideRotateCw, LucideWifiOff],
  templateUrl: './service-status-banner.html',
  styleUrl: './service-status-banner.css',
})
export class ServiceStatusBanner {
  protected readonly status = inject(ServerStatusService);
  private router = inject(Router);

  protected readonly retrying = signal(false);
  protected readonly variant = computed(() => {
    const kind = this.status.kind();
    return kind ? { kind, ...VARIANTS[kind] } : null;
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.split(/[?#]/)[0]),
    ),
    { initialValue: this.router.url.split(/[?#]/)[0] },
  );

  /** The mascot stands in Home's bottom-right corner, and nowhere else. */
  protected readonly besideMascot = computed(() => showsAssistant(this.url()));
  protected readonly overBottomBar = computed(() => hasBottomBar(this.url()));

  async retry(): Promise<void> {
    this.retrying.set(true);
    await this.status.checkNow();
    this.retrying.set(false);
  }
}

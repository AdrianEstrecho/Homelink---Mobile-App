import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  LucideArrowRight,
  LucideBell,
  LucideDownload,
  LucideHeart,
  LucideHouse,
  LucideLayoutGrid,
  LucideLifeBuoy,
  LucideLock,
  LucideMapPin,
  LucidePackage,
  LucideShare,
  LucideShoppingCart,
  LucideSmartphone,
  LucideWrench,
} from '@lucide/angular';

import { APP_BUILD, APP_TAGLINE, APP_VERSION, SUPPORT_EMAIL, SUPPORT_PHONE } from '../../../core/app-info';
import { APP_FEATURES, APP_TECH } from '../about.data';
import { RevealDirective } from '../../../shared/reveal.directive';
import { ToastService } from '../../../core/toast.service';

function webPlatform(): string {
  const installed =
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return installed ? 'Home Screen' : 'Web';
}

/**
 * The app's own "about" card: what it does, what it runs on, and which build
 * the user is looking at — the details support asks for first when something
 * goes wrong, so the version block is copyable in one tap.
 */
@Component({
  selector: 'app-about-app',
  imports: [
    RouterLink,
    RevealDirective,
    LucideSmartphone,
    LucideArrowRight,
    LucideLayoutGrid,
    LucideWrench,
    LucideShoppingCart,
    LucidePackage,
    LucideHeart,
    LucideBell,
    LucideLock,
    LucideMapPin,
    LucideHouse,
    LucideLifeBuoy,
    LucideShare,
    LucideDownload,
  ],
  templateUrl: './about-app.html',
  styleUrl: './about-app.css',
})
export class AboutApp {
  private toast = inject(ToastService);

  protected readonly features = APP_FEATURES;
  protected readonly tech = APP_TECH;
  protected readonly version = APP_VERSION;
  protected readonly build = APP_BUILD;
  protected readonly tagline = APP_TAGLINE;
  protected readonly supportEmail = SUPPORT_EMAIL;
  protected readonly supportPhone = SUPPORT_PHONE;

  /**
   * "Android" inside the Capacitor shell; otherwise this is the same build
   * served over the web, either installed to a home screen (iOS reports that
   * through `navigator.standalone`, everyone else through the display-mode
   * media query) or running in a browser tab.
   */
  protected readonly platform = Capacitor.isNativePlatform() ? 'Android' : webPlatform();

  async copyBuildInfo(): Promise<void> {
    const text = `HomeLink ${this.platform} · v${this.version} (build ${this.build})`;
    try {
      await navigator.clipboard.writeText(text);
      this.toast.showToast({ icon: 'check', title: 'Copied', description: text });
    } catch {
      this.toast.showToast({ icon: 'x-circle', title: "Couldn't copy", description: text });
    }
  }
}

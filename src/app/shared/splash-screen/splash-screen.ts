import { Component, input } from '@angular/core';
import { LucideDroplets, LucideSnowflake, LucideSun, LucideZap } from '@lucide/angular';

import { APP_VERSION } from '../../core/app-info';
import { HOUSE_PATH, MARK_VIEWBOX, PANES, WRENCH_PATH } from '../logo-mark/logo-mark';

/**
 * The in-app launch screen. On Android it takes over the moment the native
 * Capacitor splash is hidden (see App.runSplash), so the handoff reads as one
 * continuous animation instead of two separate screens: same navy field, same
 * HomeLink mark (resources/splash.png and the pre-boot splash in index.html
 * carry it too), and the rest resolves into place around it.
 *
 * The sequence tells the product's story in under two seconds: a blueprint
 * grid fades up, the house is traced and filled, its windows light up, the
 * wrench swings in beneath it and tightens with a turn, and the trades
 * HomeLink books -- air conditioning, solar, plumbing, electrical -- arrive
 * around it. The mark is drawn from logo-mark's paths rather than through
 * the LogoMark component so each part can be animated on its own.
 *
 * Purely presentational -- the owner (App) decides how long it stays up and
 * flips `leaving` to play the exit before removing it from the DOM.
 */
@Component({
  selector: 'app-splash-screen',
  imports: [LucideSnowflake, LucideSun, LucideDroplets, LucideZap],
  templateUrl: './splash-screen.html',
  styleUrl: './splash-screen.css',
})
export class SplashScreen {
  /** Plays the fade/scale-out. The host removes the element once it finishes. */
  readonly leaving = input(false);

  protected readonly version = APP_VERSION;
  protected readonly viewBox = MARK_VIEWBOX;
  protected readonly housePath = HOUSE_PATH;
  protected readonly wrenchPath = WRENCH_PATH;
  protected readonly panes = PANES;
}

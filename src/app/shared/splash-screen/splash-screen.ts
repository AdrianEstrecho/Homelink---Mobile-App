import { Component, input } from '@angular/core';
import { LucideDroplets, LucideSnowflake, LucideSun, LucideWrench, LucideZap } from '@lucide/angular';

import { APP_VERSION } from '../../core/app-info';

/**
 * The in-app launch screen. On Android it takes over the moment the native
 * Capacitor splash is hidden (see App.runSplash), so the handoff reads as one
 * continuous animation instead of two separate screens: same navy field, same
 * logo mark, the rest resolves into place around it.
 *
 * The sequence tells the product's story in about a second and a half: a
 * blueprint grid fades up, the house is drawn stroke by stroke (roof, walls,
 * door), a wrench tightens into the corner, and the trades HomeLink books --
 * air conditioning, solar, plumbing, electrical -- arrive around it. The
 * house is hand-rolled SVG rather than the Lucide component precisely so its
 * strokes can be drawn in that order.
 *
 * Purely presentational -- the owner (App) decides how long it stays up and
 * flips `leaving` to play the exit before removing it from the DOM.
 */
@Component({
  selector: 'app-splash-screen',
  imports: [LucideWrench, LucideSnowflake, LucideSun, LucideDroplets, LucideZap],
  templateUrl: './splash-screen.html',
  styleUrl: './splash-screen.css',
})
export class SplashScreen {
  /** Plays the fade/scale-out. The host removes the element once it finishes. */
  readonly leaving = input(false);

  protected readonly version = APP_VERSION;
}

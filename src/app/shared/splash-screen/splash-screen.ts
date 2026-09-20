import { Component, input } from '@angular/core';
import { LucideHouse, LucideWrench } from '@lucide/angular';

import { APP_VERSION } from '../../core/app-info';

/**
 * The in-app launch screen. On Android it takes over the moment the native
 * Capacitor splash is hidden (see App.runSplash), so the handoff reads as one
 * continuous animation instead of two separate screens: same navy field, same
 * logo mark, the wordmark and tagline just resolve into place.
 *
 * Purely presentational -- the owner (App) decides how long it stays up and
 * flips `leaving` to play the exit before removing it from the DOM.
 */
@Component({
  selector: 'app-splash-screen',
  imports: [LucideHouse, LucideWrench],
  templateUrl: './splash-screen.html',
  styleUrl: './splash-screen.css',
})
export class SplashScreen {
  /** Plays the fade/scale-out. The host removes the element once it finishes. */
  readonly leaving = input(false);

  protected readonly version = APP_VERSION;
}

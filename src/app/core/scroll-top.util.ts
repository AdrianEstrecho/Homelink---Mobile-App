/**
 * Jump the app's scroll surface back to the top.
 *
 * The router doesn't reset scroll between pages (no scrollPositionRestoration
 * is configured), so a detail screen opened from halfway down a list would
 * otherwise render already scrolled — which reads as a broken page and, worse,
 * cuts the .sheet-up entrance animation off mid-rise. Detail screens call this
 * as they mount.
 *
 * Which element actually scrolls depends on the viewport: on a phone (and in
 * the Capacitor WebView) the document scrolls, while the ≥481px browser
 * preview hands scrolling to .app-scroll-region inside the phone-width shell
 * (see styles.css). Resetting both covers either case.
 */
export function scrollAppToTop(): void {
  if (typeof document === 'undefined') return;
  window.scrollTo(0, 0);
  document.querySelector('.app-scroll-region')?.scrollTo(0, 0);
}

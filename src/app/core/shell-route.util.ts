import { Router } from '@angular/router';

/**
 * Every destination the side menu links to. These are the app's "top level" —
 * arriving at one is a lateral move, not a drill-down, so the topbar offers
 * the menu (hamburger) rather than a back arrow. Anything not listed here
 * (product detail, checkout, an account sub-page, an About sub-page) was
 * reached *from* somewhere, so it gets the back arrow instead — as does a root
 * route opened with DRILL_DOWN_STATE (see below).
 */
const ROOT_ROUTES = new Set([
  '/',
  '/products',
  '/services',
  '/gallery',
  '/cart',
  '/wishlist',
  '/orders',
  '/bookings',
  '/account',
  '/about',
  '/faq',
  '/location',
  '/policies',
  '/terms',
]);

const CHROMELESS_ROUTES = ['/login', '/register', '/forgot-password', '/verify-reset-code', '/reset-password', '/admin'];

export function isRootRoute(url: string): boolean {
  return ROOT_ROUTES.has(url);
}

/**
 * Router navigation state that makes a hop to a top-level route count as a drill-down —
 * Home's cart button, search/filter button and category chips open /cart and /products
 * with it, so the topbar offers a back arrow to Home rather than the menu. The router
 * keeps it in history.state, so it survives back/forward and a reload.
 */
export const DRILL_DOWN_STATE = { drillDown: true };

export function isDrillDown(router: Router): boolean {
  return router.lastSuccessfulNavigation()?.extras.state?.['drillDown'] === true;
}

/** For a page re-navigating to itself (filters, paging), so a drill-down stays one. */
export function carriedShellState(router: Router): typeof DRILL_DOWN_STATE | undefined {
  return isDrillDown(router) ? DRILL_DOWN_STATE : undefined;
}

/**
 * Auth screens are self-contained (own header/back link via AuthLayout) and render with
 * no app shell chrome. `/admin` (and everything under it, including `/admin/login`) is
 * chromeless too — the staff portal has its own AdminShell topbar/drawer nav instead of
 * the customer Navbar/SideMenu.
 */
export function isChromelessRoute(url: string): boolean {
  return CHROMELESS_ROUTES.some((p) => url === p || url.startsWith(p + '/'));
}

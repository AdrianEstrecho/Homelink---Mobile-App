/**
 * Every destination the side menu links to. These are the app's "top level" —
 * arriving at one is a lateral move, not a drill-down, so the topbar offers
 * the menu (hamburger) rather than a back arrow. Anything not listed here
 * (product detail, checkout, an account sub-page, an About sub-page) was
 * reached *from* somewhere, so it gets the back arrow instead.
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
  '/location',
  '/policies',
  '/terms',
]);

const CHROMELESS_ROUTES = ['/login', '/register', '/forgot-password', '/verify-reset-code', '/reset-password', '/admin'];

export function isRootRoute(url: string): boolean {
  return ROOT_ROUTES.has(url);
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

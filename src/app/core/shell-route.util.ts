const TAB_ROOTS = new Set(['/', '/products', '/services', '/cart', '/account']);

const CHROMELESS_ROUTES = ['/login', '/register', '/forgot-password', '/verify-reset-code', '/reset-password', '/admin'];

/** Bottom-nav destinations only render their tab bar at these exact URLs. */
export function isTabRoot(url: string): boolean {
  return TAB_ROOTS.has(url);
}

/**
 * Auth screens are self-contained (own header/back link via AuthLayout) and render with
 * no app shell chrome. `/admin` (and everything under it, including `/admin/login`) is
 * chromeless too — the staff portal has its own AdminShell topbar/drawer nav instead of
 * the customer Navbar/BottomNav.
 */
export function isChromelessRoute(url: string): boolean {
  return CHROMELESS_ROUTES.some((p) => url === p || url.startsWith(p + '/'));
}

const TAB_ROOTS = new Set(['/', '/products', '/services', '/cart', '/account']);

const CHROMELESS_ROUTES = ['/login', '/register', '/forgot-password', '/verify-reset-code', '/reset-password'];

/** Bottom-nav destinations only render their tab bar at these exact URLs. */
export function isTabRoot(url: string): boolean {
  return TAB_ROOTS.has(url);
}

/** Auth screens are self-contained (own header/back link via AuthLayout) and render with no app shell chrome. */
export function isChromelessRoute(url: string): boolean {
  return CHROMELESS_ROUTES.some((p) => url === p || url.startsWith(p + '/'));
}

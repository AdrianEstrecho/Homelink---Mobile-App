import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { UserRole } from './user.model';

export const AUTH_PROMPT_TOAST_ID = 'auth-required';

export type RequireRoleResult = 'ok' | 'unauthenticated' | 'forbidden';

/**
 * Shared by roleGuard and every inline "this needs an account" tap (add to cart,
 * wishlist toggle, buy now, ...). A bare `auth.user()` read can't tell "still
 * checking the session on cold start" apart from "logged out", so this waits out
 * AuthService's bootstrap /auth/me check first — showing a loading toast while it's
 * in flight — before deciding. On the way out it either lets the caller proceed or
 * raises a login-prompt toast with a "Log In" action.
 *
 * Both toasts share the fixed AUTH_PROMPT_TOAST_ID, so re-triggering this while one
 * is already showing (another tap on the same gated control) refreshes that single
 * toast in place — see ToastService.showToast() — instead of stacking a duplicate.
 */
export async function requireRole(
  auth: AuthService,
  toast: ToastService,
  allowedRoles: UserRole[],
  loginPath = '/login',
): Promise<RequireRoleResult> {
  if (auth.loading()) {
    toast.showToast({
      id: AUTH_PROMPT_TOAST_ID,
      icon: 'spinner',
      title: 'Checking your session…',
      duration: 15000,
    });
  }

  await auth.authReady;
  const user = auth.user();

  if (!user) {
    toast.showToast({
      id: AUTH_PROMPT_TOAST_ID,
      icon: 'x-circle',
      iconClass: 'bg-amber-100 text-amber-600',
      title: 'Please log in to continue',
      description: 'You need to log in to do that.',
      action: { label: 'Log In', to: loginPath },
      duration: 5000,
    });
    return 'unauthenticated';
  }

  if (!allowedRoles.includes(user.role)) {
    toast.showToast({
      id: AUTH_PROMPT_TOAST_ID,
      icon: 'x-circle',
      iconClass: 'bg-amber-100 text-amber-600',
      title: 'Not available for this account',
      description: 'This area is for customer accounts only.',
      duration: 4000,
    });
    return 'forbidden';
  }

  toast.dismissToast(AUTH_PROMPT_TOAST_ID);
  return 'ok';
}

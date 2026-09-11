import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { requireRole } from './require-role';
import { ToastService } from './toast.service';
import { UserRole } from './user.model';

/**
 * Angular analog of frontend/src/components/ProtectedRoute.jsx, scoped to
 * `roles` only — the React version's `positions` gating is per-employee-position
 * and stays out of scope here, since the mobile admin section (see
 * features/admin/) is admin-role-only, not employee-position-scoped. The
 * customer-facing routes below still reject staff accounts at login (see
 * login.ts); only the `/admin/*` routes accept the `admin` role.
 *
 * Not logged in at all no longer silently drops the visitor onto /login —
 * that read as the tap having done nothing. It now blocks the navigation
 * (canActivate: false, so the tab/link they tapped just stays put) and raises
 * a toast telling them to log in, with a button that takes them there. See
 * requireRole() for the shared loading/dedupe behavior.
 */
export function roleGuard(allowedRoles: UserRole[], redirectTo = '/login'): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const result = await requireRole(auth, toast, allowedRoles, redirectTo);
    if (result === 'unauthenticated') return false;
    if (result === 'forbidden') return router.createUrlTree(['/']);
    return true;
  };
}

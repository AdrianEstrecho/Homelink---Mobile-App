import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { UserRole } from './user.model';

/**
 * Angular analog of frontend/src/components/ProtectedRoute.jsx, scoped to
 * `roles` only — the React version's `positions` gating is per-employee-position
 * and stays out of scope here, since the mobile admin section (see
 * features/admin/) is admin-role-only, not employee-position-scoped. The
 * customer-facing routes below still reject staff accounts at login (see
 * login.ts); only the `/admin/*` routes accept the `admin` role.
 */
export function roleGuard(allowedRoles: UserRole[], redirectTo = '/login'): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.authReady;
    const user = auth.user();
    if (!user) return router.createUrlTree([redirectTo]);
    if (!allowedRoles.includes(user.role)) return router.createUrlTree(['/']);
    return true;
  };
}

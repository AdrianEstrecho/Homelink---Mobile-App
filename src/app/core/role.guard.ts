import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { UserRole } from './user.model';

/**
 * Angular analog of frontend/src/components/ProtectedRoute.jsx, scoped to
 * `roles` only — the React version's `positions` gating is admin-portal-only
 * and out of scope here, since every user in this app is a customer (staff
 * accounts are rejected at login).
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

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * Not every 401 means "your session is invalid" — backend/routes/auth.js also
 * returns 401 for business-logic failures on requests that carry a perfectly
 * valid JWT (wrong current password, wrong login password, archived account,
 * failed Google sign-in). Only backend/middleware/auth.js's authenticate()
 * guard produces these two exact messages, so match on them specifically
 * instead of the status code alone — otherwise e.g. a mistyped current
 * password in the Security tab would incorrectly log the user out.
 */
const SESSION_EXPIRED_MESSAGES = new Set(['Authentication required', 'Invalid or expired token']);

export const sessionExpiryInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const message = (err.error as { error?: string } | null)?.error;
        if (message && SESSION_EXPIRED_MESSAGES.has(message)) {
          auth.logout().then(() => {
            toast.showToast({
              icon: 'x-circle',
              title: 'Session expired',
              description: 'Please log in again.',
            });
            if (router.url !== '/login') {
              router.navigateByUrl('/login');
            }
          });
        }
      }
      return throwError(() => err);
    }),
  );
};

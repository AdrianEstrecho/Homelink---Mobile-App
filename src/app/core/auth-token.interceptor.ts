import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

/**
 * Scoped to our own API only, so this JWT is never attached to unrelated requests.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  return from(tokens.get()).pipe(
    switchMap((token) => {
      if (token && req.url.startsWith(environment.apiUrl)) {
        req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
      return next(req);
    }),
  );
};

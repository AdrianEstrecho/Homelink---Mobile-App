import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

/**
 * Scoped to our own API only — PaymongoService talks to api.paymongo.com
 * directly with PayMongo's public key, and must never see this JWT.
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

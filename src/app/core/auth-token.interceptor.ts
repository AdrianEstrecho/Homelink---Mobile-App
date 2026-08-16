import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

/**
 * Scoped to our own API only — PaymongoService talks to api.paymongo.com
 * directly with PayMongo's public key, and must never see this JWT.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  const token = tokens.get();
  if (token && req.url.startsWith(environment.apiUrl)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

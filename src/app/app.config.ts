import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { authTokenInterceptor } from './core/auth-token.interceptor';
import { GlobalErrorHandler } from './core/global-error-handler';
import { sessionExpiryInterceptor } from './core/session-expiry.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authTokenInterceptor, sessionExpiryInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};

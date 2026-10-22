import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';

import { ApiError } from './api.service';
import { ErrorStateService } from './error-state.service';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorState = inject(ErrorStateService);
  private injector = inject(Injector);

  handleError(error: unknown): void {
    console.error('Unhandled UI error:', error);

    // provideBrowserGlobalErrorListeners routes every unhandled promise rejection here, so a
    // request some page forgot to catch (a 503 while the server is swamped, a dropped
    // connection) used to swap the whole app for the "Something went wrong" screen. The web's
    // ErrorBoundary only catches render errors, so there it's just a console error. A failed
    // request isn't a broken UI: say what happened and leave the page as it is.
    if (error instanceof ApiError) {
      // ServiceStatusBanner already covers "couldn't reach the server".
      if (error.code === 'network' || error.code === 'unavailable') return;
      this.injector.get(ToastService).showToast({
        id: 'unhandled-api-error',
        icon: 'x-circle',
        iconClass: 'bg-red-50 text-red-500',
        title: "That didn't go through",
        description: error.message,
      });
      return;
    }

    this.errorState.hasError.set(true);
  }
}

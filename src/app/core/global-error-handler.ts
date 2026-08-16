import { ErrorHandler, Injectable, inject } from '@angular/core';

import { ErrorStateService } from './error-state.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorState = inject(ErrorStateService);

  handleError(error: unknown): void {
    console.error('Unhandled UI error:', error);
    this.errorState.hasError.set(true);
  }
}

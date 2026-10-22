import { TestBed } from '@angular/core/testing';

import { ApiError } from './api.service';
import { ErrorStateService } from './error-state.service';
import { GlobalErrorHandler } from './global-error-handler';
import { ToastService } from './toast.service';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let errorState: ErrorStateService;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GlobalErrorHandler] });
    handler = TestBed.inject(GlobalErrorHandler);
    errorState = TestBed.inject(ErrorStateService);
    toasts = TestBed.inject(ToastService);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows an uncaught request failure as a toast instead of the crash screen', () => {
    handler.handleError(new ApiError('HomeLink is having trouble connecting right now.', 'db_unavailable', 503));
    expect(errorState.hasError()).toBe(false);
    expect(toasts.toasts()[0]?.description).toBe('HomeLink is having trouble connecting right now.');
  });

  it('leaves "server unreachable" to the status banner', () => {
    handler.handleError(new ApiError("We can't reach HomeLink right now.", 'network'));
    expect(errorState.hasError()).toBe(false);
    expect(toasts.toasts()).toHaveLength(0);
  });

  it('still shows the crash screen for a real UI error', () => {
    handler.handleError(new TypeError("Cannot read properties of undefined (reading 'name')"));
    expect(errorState.hasError()).toBe(true);
  });
});

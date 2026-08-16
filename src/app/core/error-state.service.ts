import { Injectable, signal } from '@angular/core';

/**
 * Flips true when GlobalErrorHandler catches an otherwise-unhandled error.
 * App reads this to swap in a fallback screen — the closest app-wide
 * equivalent to frontend/src/components/ErrorBoundary.jsx (Angular has no
 * lightweight per-route error boundary of its own).
 */
@Injectable({ providedIn: 'root' })
export class ErrorStateService {
  readonly hasError = signal(false);
}

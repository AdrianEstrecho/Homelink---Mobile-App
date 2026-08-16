import { Injectable, signal } from '@angular/core';

interface PendingReset {
  email: string;
  code?: string;
}

/**
 * Deliberately a plain in-memory service, not Angular Router navigation
 * state — history-based nav state tends to survive a plain page refresh,
 * which would accidentally make this flow resumable across a refresh. A
 * service wiped on every app bootstrap guarantees "refresh expires the
 * flow" by construction. See mobile port plan, Phase 2.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetFlowService {
  private readonly pending = signal<PendingReset | null>(null);
  readonly current = this.pending.asReadonly();

  setEmail(email: string): void {
    this.pending.set({ email });
  }

  setVerified(email: string, code: string): void {
    this.pending.set({ email, code });
  }

  clear(): void {
    this.pending.set(null);
  }
}

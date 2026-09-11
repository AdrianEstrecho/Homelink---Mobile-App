import { Injectable, signal } from '@angular/core';

export type ToastIcon = 'check' | 'trash' | 'x-circle' | 'spinner';

export interface ToastAction {
  label: string;
  to: string;
}

export interface ToastRequest {
  /** Stable key for toasts that can recur (e.g. an auth prompt re-triggered by another
   *  tap). Re-showing the same id refreshes that toast in place instead of stacking a
   *  duplicate — see showToast(). Omit for one-off toasts (each gets a random id). */
  id?: string;
  icon?: ToastIcon;
  iconClass?: string;
  image?: string;
  title?: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
}

export interface Toast extends ToastRequest {
  id: string;
  duration: number;
  /** Bumped on every show/refresh so the viewport's `track` sees a new identity and
   *  replays the entrance/progress-bar animation even when `id` is reused. */
  nonce: number;
}

/** Ported from frontend/src/context/ToastContext.jsx. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private nextNonce = 0;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  showToast(toast: ToastRequest): string {
    const id = toast.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = toast.duration ?? 4000;
    const nonce = ++this.nextNonce;

    clearTimeout(this.timers.get(id));
    this.toasts.update((prev) => [...prev.filter((t) => t.id !== id), { ...toast, id, duration, nonce }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismissToast(id), duration),
    );
    return id;
  }

  dismissToast(id: string): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((prev) => prev.filter((t) => t.id !== id));
  }
}

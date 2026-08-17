import { Injectable, signal } from '@angular/core';

export type ToastIcon = 'check' | 'trash' | 'x-circle';

export interface ToastAction {
  label: string;
  to: string;
}

export interface ToastRequest {
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
}

/** Ported from frontend/src/context/ToastContext.jsx. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  showToast(toast: ToastRequest): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = toast.duration ?? 4000;
    this.toasts.update((prev) => [...prev, { id, duration, ...toast }]);
    setTimeout(() => this.dismissToast(id), duration);
    return id;
  }

  dismissToast(id: string): void {
    this.toasts.update((prev) => prev.filter((t) => t.id !== id));
  }
}

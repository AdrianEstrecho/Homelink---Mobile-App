import { Component, inject, signal, viewChild } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Booking } from '../../core/booking.model';
import { statusColor } from '../../core/format.util';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';

@Component({
  selector: 'app-bookings',
  imports: [PricePipe, CancelReasonModal, LucideArrowLeft],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
})
export class Bookings {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  protected readonly statusColor = statusColor;
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly cancelTarget = signal<Booking | null>(null);

  protected readonly cancelModal = viewChild(CancelReasonModal);

  constructor() {
    this.api
      .get<Booking[]>('/bookings/my')
      .then((data) => this.bookings.set(data))
      .catch(() => {});
  }

  goBack(): void {
    window.history.back();
  }

  statusLabel(status: string): string {
    return status.replace('_', ' ');
  }

  async submitCancel(reason: string): Promise<void> {
    const booking = this.cancelTarget();
    if (!booking) return;
    try {
      await this.api.put(`/bookings/${booking.id}/cancel`, { reason });
      this.bookings.update((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled', cancel_reason: reason } : b)));
      this.cancelTarget.set(null);
      this.toast.showToast({
        icon: 'x-circle',
        iconClass: 'bg-red-100 text-red-600',
        title: 'Booking cancelled',
        description: booking.service_name,
      });
    } catch (err) {
      this.cancelModal()?.showError((err as Error).message);
    }
  }
}

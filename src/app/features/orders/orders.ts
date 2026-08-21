import { DatePipe } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { LucideChevronRight, LucideShoppingBag } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { statusColor } from '../../core/format.util';
import { Order } from '../../core/order.model';
import { PricePipe } from '../../core/price.pipe';
import { ToastService } from '../../core/toast.service';
import { CancelReasonModal } from '../../shared/cancel-reason-modal/cancel-reason-modal';
import { OrderDetailsModal } from '../../shared/order-details-modal/order-details-modal';

@Component({
  selector: 'app-orders',
  imports: [DatePipe, PricePipe, OrderDetailsModal, CancelReasonModal, LucideChevronRight, LucideShoppingBag],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  protected readonly statusColor = statusColor;
  protected readonly orders = signal<Order[]>([]);
  protected readonly selectedOrder = signal<Order | null>(null);
  protected readonly cancelTarget = signal<Order | null>(null);

  protected readonly cancelModal = viewChild(CancelReasonModal);

  protected readonly billedTo = () => {
    const u = this.auth.user();
    return u ? { name: `${u.firstName} ${u.lastName}`, email: u.email } : null;
  };

  constructor() {
    this.api
      .get<Order[]>('/orders/my')
      .then((data) => this.orders.set(data))
      .catch(() => {});
  }

  async submitCancel(reason: string): Promise<void> {
    const order = this.cancelTarget();
    if (!order) return;
    try {
      await this.api.put(`/orders/${order.id}/cancel`, { reason });
      this.orders.update((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled', cancel_reason: reason } : o)));
      this.selectedOrder.update((prev) => (prev && prev.id === order.id ? { ...prev, status: 'cancelled', cancel_reason: reason } : prev));
      this.cancelTarget.set(null);
      this.toast.showToast({
        icon: 'x-circle',
        iconClass: 'bg-red-100 text-red-600',
        title: 'Order cancelled',
        description: `Order #${order.id.slice(0, 8).toUpperCase()}`,
      });
    } catch (err) {
      this.cancelModal()?.showError((err as Error).message);
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronDown, LucideSearch } from '@lucide/angular';

import { AdminOrder } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { formatPrice, statusColor } from '../../../core/format.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Select, SelectOption } from '../../../shared/select/select';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const STATUS_OPTIONS: SelectOption[] = STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));

/**
 * Mobile analog of frontend/src/pages/admin/Orders.jsx. The desktop table +
 * click-to-open-modal pattern becomes a tap-to-expand accordion card list —
 * better suited to a phone screen than either a horizontally-scrolling table
 * or a full-screen modal stacked on top of the list.
 */
@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, ConfirmDialog, Select, LucideSearch, LucideChevronDown],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.css',
})
export class AdminOrders {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;
  protected readonly statusColor = statusColor;
  protected readonly statuses = STATUSES;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly orders = signal<AdminOrder[]>([]);
  protected readonly tab = signal<'all' | (typeof STATUSES)[number]>('all');
  protected readonly search = signal('');
  protected readonly expandedId = signal<string | null>(null);
  protected readonly confirmStatus = signal<{ id: string; status: string } | null>(null);

  protected readonly counts = computed(() => {
    const list = this.orders();
    const c: Record<string, number> = { all: list.length };
    for (const s of STATUSES) c[s] = list.filter((o) => o.status === s).length;
    return c;
  });

  protected readonly filtered = computed(() => {
    const t = this.tab();
    const q = this.search().trim().toLowerCase();
    return this.orders()
      .filter((o) => t === 'all' || o.status === t)
      .filter((o) => !q || `${o.first_name} ${o.last_name}`.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  });

  private load(): void {
    this.api.get<AdminOrder[]>('/admin/orders').then((o) => this.orders.set(o)).catch(() => {});
  }

  constructor() {
    this.load();
  }

  toggleExpand(id: string): void {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  requestStatusChange(id: string, status: string): void {
    this.confirmStatus.set({ id, status });
  }

  async confirmStatusChange(): Promise<void> {
    const target = this.confirmStatus();
    if (!target) return;
    await this.api.put(`/admin/orders/${target.id}/status`, { status: target.status });
    this.confirmStatus.set(null);
    this.load();
  }

  statusLabel(status: string): string {
    return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideChevronDown, LucideSearch, LucideWrench } from '@lucide/angular';

import { AdminBooking, AdminUser } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { formatPrice, statusColor } from '../../../core/format.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Select, SelectOption } from '../../../shared/select/select';

const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
const statusLabel = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const STATUS_OPTIONS: SelectOption[] = STATUSES.map((s) => ({ value: s, label: statusLabel(s) }));

interface AssignTarget {
  bookingId: string;
  employeeId: string;
}

/**
 * Mobile analog of frontend/src/pages/admin/Bookings.jsx — same accordion
 * card pattern as admin-orders, plus the technician-assignment Select
 * (installers only, fetched via GET /admin/users?role=employee&position=installer,
 * same endpoint the web admin's booking-coordinator scope uses).
 */
@Component({
  selector: 'app-admin-bookings',
  imports: [FormsModule, ConfirmDialog, Select, LucideSearch, LucideChevronDown, LucideWrench],
  templateUrl: './admin-bookings.html',
  styleUrl: './admin-bookings.css',
})
export class AdminBookings {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;
  protected readonly statusColor = statusColor;
  protected readonly statuses = STATUSES;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly bookings = signal<AdminBooking[]>([]);
  protected readonly installers = signal<AdminUser[]>([]);
  protected readonly tab = signal<'all' | (typeof STATUSES)[number]>('all');
  protected readonly search = signal('');
  protected readonly expandedId = signal<string | null>(null);
  protected readonly confirmStatus = signal<{ id: string; status: string } | null>(null);
  protected readonly confirmAssign = signal<AssignTarget | null>(null);

  protected readonly installerOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Unassigned' },
    ...this.installers().map((i) => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })),
  ]);

  protected readonly counts = computed(() => {
    const list = this.bookings();
    const c: Record<string, number> = { all: list.length };
    for (const s of STATUSES) c[s] = list.filter((b) => b.status === s).length;
    return c;
  });

  protected readonly filtered = computed(() => {
    const t = this.tab();
    const q = this.search().trim().toLowerCase();
    return this.bookings()
      .filter((b) => t === 'all' || b.status === t)
      .filter((b) => !q || `${b.first_name} ${b.last_name}`.toLowerCase().includes(q) || b.service_name.toLowerCase().includes(q));
  });

  private load(): void {
    this.api.get<AdminBooking[]>('/admin/bookings').then((b) => this.bookings.set(b)).catch(() => {});
    this.api
      .get<AdminUser[]>('/admin/users?role=employee&position=installer')
      .then((u) => this.installers.set(u))
      .catch(() => {});
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

  requestAssign(bookingId: string, employeeId: string): void {
    this.confirmAssign.set({ bookingId, employeeId });
  }

  async confirmStatusChangeAction(): Promise<void> {
    const target = this.confirmStatus();
    if (!target) return;
    await this.api.put(`/admin/bookings/${target.id}`, { status: target.status });
    this.confirmStatus.set(null);
    this.load();
  }

  async confirmAssignAction(): Promise<void> {
    const target = this.confirmAssign();
    if (!target) return;
    await this.api.put(`/admin/bookings/${target.bookingId}`, { employeeId: target.employeeId || null });
    this.confirmAssign.set(null);
    this.load();
  }

  statusLabel(status: string): string {
    return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  }

  assignTargetName(): string {
    const target = this.confirmAssign();
    if (!target?.employeeId) return '';
    const i = this.installers().find((x) => x.id === target.employeeId);
    return i ? `${i.first_name} ${i.last_name}` : '';
  }

  isUnassign(): boolean {
    const target = this.confirmAssign();
    return !!target && !target.employeeId;
  }

  technicianName(b: AdminBooking): string {
    return b.employee_id ? `${b.emp_first ?? ''} ${b.emp_last ?? ''}`.trim() || 'Assigned' : 'Unassigned';
  }
}

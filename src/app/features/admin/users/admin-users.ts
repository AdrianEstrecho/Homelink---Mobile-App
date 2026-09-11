import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArchive,
  LucideArchiveRestore,
  LucideArrowUpCircle,
  LucideEye,
  LucideEyeOff,
  LucidePlus,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';

import { AdminUser, AdminUserRole, EMPLOYEE_POSITIONS, POSITION_LABELS } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Select, SelectOption } from '../../../shared/select/select';

const ROLE_TABS: { key: AdminUserRole; label: string }[] = [
  { key: 'customer', label: 'Customers' },
  { key: 'employee', label: 'Employees' },
  { key: 'admin', label: 'Admins' },
];

const POSITION_OPTIONS: SelectOption[] = EMPLOYEE_POSITIONS.map((p) => ({ value: p, label: POSITION_LABELS[p] }));

const POSITION_COLORS: Record<string, string> = {
  inventory_clerk: 'bg-teal-100 text-teal-800',
  booking_coordinator: 'bg-blue-100 text-blue-800',
  installer: 'bg-orange-100 text-orange-800',
  accounting: 'bg-emerald-100 text-emerald-800',
  hr: 'bg-pink-100 text-pink-800',
  general_staff: 'bg-gray-100 text-gray-700',
};

interface NewUserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  position: string;
}

const emptyForm: NewUserForm = { email: '', password: '', firstName: '', lastName: '', phone: '', position: 'general_staff' };

function maskPhone(phone?: string | null): string {
  if (!phone || phone.length < 4) return phone || '—';
  return `${phone.slice(0, 4)}${'•'.repeat(Math.max(0, phone.length - 6))}${phone.slice(-2)}`;
}

function maskAddress(address?: string | null): string {
  if (!address) return '—';
  const words = address.trim().split(/\s+/);
  if (words.length <= 1) return '••••••';
  return `${words[0]} ${'•'.repeat(6)}`;
}

/**
 * Mobile analog of frontend/src/pages/admin/UserManagementPanel.jsx (which the
 * web app reuses for Users/AdminManagement/ArchivedUsers/EmployeeManagement).
 * Admin-only here, so every write applies immediately — none of the HR
 * change-request branches from the web version are ported. Archived accounts
 * live behind a toggle on this same page instead of a separate route, to keep
 * the mobile nav to five items.
 */
@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, ConfirmDialog, Select, LucidePlus, LucideEye, LucideEyeOff, LucideArchive, LucideArchiveRestore, LucideTrash2, LucideArrowUpCircle, LucideX],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
})
export class AdminUsers {
  private api = inject(ApiService);

  protected readonly roleTabs = ROLE_TABS;
  protected readonly positionOptions = POSITION_OPTIONS;
  protected readonly positionLabels = POSITION_LABELS;
  protected readonly positionColors = POSITION_COLORS;
  protected readonly maskPhone = maskPhone;
  protected readonly maskAddress = maskAddress;

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly tab = signal<AdminUserRole>('customer');
  protected readonly archivedView = signal(false);
  protected readonly search = signal('');
  protected readonly revealed = signal<Set<string>>(new Set());
  protected readonly promotingId = signal<string | null>(null);

  protected readonly showForm = signal(false);
  protected readonly form = signal<NewUserForm>({ ...emptyForm });

  protected readonly confirmArchiveId = signal<string | null>(null);
  protected readonly confirmDeleteId = signal<string | null>(null);

  protected readonly counts = computed(() => {
    const list = this.users();
    const archived = this.archivedView();
    const c: Record<string, number> = {};
    for (const t of ROLE_TABS) c[t.key] = list.filter((u) => u.role === t.key && !!u.archived === archived).length;
    return c;
  });

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.users()
      .filter((u) => u.role === this.tab() && !!u.archived === this.archivedView())
      .filter((u) => !q || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q));
  });

  private load(): void {
    this.api.get<AdminUser[]>('/admin/users').then((u) => this.users.set(u)).catch(() => {});
  }

  constructor() {
    this.load();
  }

  setTab(t: AdminUserRole): void {
    this.tab.set(t);
    this.promotingId.set(null);
  }

  toggleArchivedView(): void {
    this.archivedView.update((v) => !v);
    this.promotingId.set(null);
  }

  toggleReveal(id: string): void {
    this.revealed.update((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isRevealed(id: string): boolean {
    return this.revealed().has(id);
  }

  openForm(): void {
    this.form.set({ ...emptyForm });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  patchForm(patch: Partial<NewUserForm>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  async submitForm(): Promise<void> {
    const f = this.form();
    const role = this.tab() === 'admin' ? 'admin' : 'employee';
    await this.api.post('/admin/users', { ...f, role });
    this.showForm.set(false);
    this.load();
  }

  async promote(id: string, position: string): Promise<void> {
    await this.api.put(`/admin/users/${id}/promote`, { position });
    this.promotingId.set(null);
    this.load();
  }

  async archiveUser(id: string): Promise<void> {
    await this.api.put(`/admin/users/${id}/archive`);
    this.load();
  }

  async restoreUser(id: string): Promise<void> {
    await this.api.put(`/admin/users/${id}/restore`);
    this.load();
  }

  async deleteForever(id: string): Promise<void> {
    await this.api.delete(`/admin/users/${id}`);
    this.load();
  }

  confirmArchive(): void {
    const id = this.confirmArchiveId();
    if (id) this.archiveUser(id);
    this.confirmArchiveId.set(null);
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    if (id) this.deleteForever(id);
    this.confirmDeleteId.set(null);
  }
}

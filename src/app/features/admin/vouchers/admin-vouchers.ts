import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTicket, LucideTrash2, LucideX } from '@lucide/angular';

import { AdminVoucher } from '../../../core/admin.model';
import { ApiService } from '../../../core/api.service';
import { formatPrice } from '../../../core/format.util';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Select, SelectOption } from '../../../shared/select/select';

interface VoucherForm {
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  minOrder: string;
  maxUses: string;
  validFrom: string;
  validUntil: string;
}

const emptyForm: VoucherForm = { code: '', discountType: 'percent', discountValue: '', minOrder: '', maxUses: '100', validFrom: '', validUntil: '' };

const DISCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'percent', label: 'Percent Off' },
  { value: 'fixed', label: 'Fixed Amount Off' },
];

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

/**
 * Mobile analog of frontend/src/pages/admin/Vouchers.jsx, admin-only like the
 * other mobile admin pages (no general_staff approval-request branches). The
 * desktop table becomes a card per voucher; tapping the Active/Inactive badge
 * toggles it, same as the web table's status column.
 */
@Component({
  selector: 'app-admin-vouchers',
  imports: [FormsModule, ConfirmDialog, Select, LucidePlus, LucideTicket, LucideTrash2, LucideX],
  templateUrl: './admin-vouchers.html',
  styleUrl: './admin-vouchers.css',
})
export class AdminVouchers {
  private api = inject(ApiService);

  protected readonly formatPrice = formatPrice;
  protected readonly discountTypeOptions = DISCOUNT_TYPE_OPTIONS;

  protected readonly vouchers = signal<AdminVoucher[]>([]);
  protected readonly loaded = signal(false);
  protected readonly showForm = signal(false);
  protected readonly form = signal<VoucherForm>({ ...emptyForm });
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly pageError = signal('');

  protected readonly confirmDeleteId = signal<string | null>(null);
  protected readonly confirmToggleId = signal<string | null>(null);

  protected readonly toggleTarget = computed(() => this.vouchers().find((v) => v.id === this.confirmToggleId()) ?? null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .get<AdminVoucher[]>('/admin/vouchers')
      .then((v) => {
        this.vouchers.set(v);
        this.loaded.set(true);
      })
      .catch(() => {});
  }

  validPeriod(v: AdminVoucher): string {
    if (!v.valid_from && !v.valid_until) return 'No date limit';
    return `${formatDate(v.valid_from)} – ${formatDate(v.valid_until)}`;
  }

  discountLabel(v: AdminVoucher): string {
    return `${v.discount_type === 'percent' ? `${v.discount_value}%` : formatPrice(v.discount_value)} off`;
  }

  openForm(): void {
    this.form.set({ ...emptyForm });
    this.error.set('');
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.form.set({ ...emptyForm });
    this.error.set('');
  }

  patchForm(patch: Partial<VoucherForm>): void {
    this.form.update((f) => ({ ...f, ...patch }));
  }

  async submitForm(): Promise<void> {
    const f = this.form();
    this.error.set('');
    this.saving.set(true);
    try {
      await this.api.post('/admin/vouchers', {
        code: f.code,
        discountType: f.discountType,
        discountValue: Number(f.discountValue),
        minOrder: Number(f.minOrder) || 0,
        maxUses: Number(f.maxUses) || 100,
        validFrom: f.validFrom || null,
        validUntil: f.validUntil || null,
      });
      this.cancelForm();
      this.load();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async run(fn: () => Promise<unknown>): Promise<void> {
    this.pageError.set('');
    try {
      await fn();
      this.load();
    } catch (err) {
      this.pageError.set((err as Error).message);
    }
  }

  confirmToggle(): void {
    const id = this.confirmToggleId();
    this.confirmToggleId.set(null);
    if (id) this.run(() => this.api.put(`/admin/vouchers/${id}/toggle`));
  }

  confirmDelete(): void {
    const id = this.confirmDeleteId();
    this.confirmDeleteId.set(null);
    if (id) this.run(() => this.api.delete(`/admin/vouchers/${id}`));
  }
}

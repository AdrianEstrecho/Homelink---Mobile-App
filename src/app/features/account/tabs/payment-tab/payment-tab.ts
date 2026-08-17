import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideCreditCard, LucidePlus, LucideShieldCheck, LucideStar, LucideTrash2, LucideX } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { SavedPaymentMethod } from '../../../../core/account.model';
import { Select, SelectOption } from '../../../../shared/select/select';

interface NewCardForm {
  cardNumber: string;
  expMonth: string;
  expYear: string;
}

const emptyForm: NewCardForm = { cardNumber: '', expMonth: '', expYear: '' };
const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') }));
const currentYear = new Date().getFullYear();
const yearOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(currentYear + i), label: String(currentYear + i) }));

@Component({
  selector: 'app-payment-tab',
  imports: [FormsModule, Select, LucideCreditCard, LucidePlus, LucideStar, LucideTrash2, LucideX, LucideShieldCheck],
  templateUrl: './payment-tab.html',
  styleUrl: './payment-tab.css',
})
export class PaymentTab {
  private api = inject(ApiService);

  protected readonly monthOptions = monthOptions;
  protected readonly yearOptions = yearOptions;

  protected readonly methods = signal<SavedPaymentMethod[] | null>(null);
  protected readonly form = signal<NewCardForm>(emptyForm);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .get<SavedPaymentMethod[]>('/payment-methods/my')
      .then((data) => this.methods.set(data))
      .catch(() => this.methods.set([]));
  }

  updateField<K extends keyof NewCardForm>(key: K, value: NewCardForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  startAdd(): void {
    this.form.set(emptyForm);
    this.showForm.set(true);
    this.error.set('');
  }

  cancel(): void {
    this.showForm.set(false);
    this.form.set(emptyForm);
    this.error.set('');
  }

  async handleSubmit(): Promise<void> {
    if (!this.form().expMonth || !this.form().expYear) {
      this.error.set('Please select an expiry month and year.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.api.post('/payment-methods', this.form());
      this.load();
      this.cancel();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Remove this payment method?')) return;
    await this.api.delete(`/payment-methods/${id}`);
    this.load();
  }

  async setDefault(id: string): Promise<void> {
    await this.api.put(`/payment-methods/${id}/default`);
    this.load();
  }
}

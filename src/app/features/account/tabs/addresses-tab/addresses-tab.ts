import { Component, inject, signal } from '@angular/core';
import { LucideMapPin, LucidePencil, LucidePlus, LucideStar, LucideTrash2, LucideX } from '@lucide/angular';

import { ApiService } from '../../../../core/api.service';
import { Address, NewAddressForm } from '../../../../core/address.model';
import { AddressFormFields, emptyAddressForm as emptyForm } from '../../../../shared/address-form-fields/address-form-fields';

@Component({
  selector: 'app-addresses-tab',
  imports: [AddressFormFields, LucideMapPin, LucidePlus, LucideStar, LucidePencil, LucideTrash2, LucideX],
  templateUrl: './addresses-tab.html',
  styleUrl: './addresses-tab.css',
})
export class AddressesTab {
  private api = inject(ApiService);

  protected readonly addresses = signal<Address[] | null>(null);
  protected readonly form = signal<NewAddressForm>(emptyForm);
  protected readonly editingId = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.load();
  }

  private load(): void {
    this.api
      .get<Address[]>('/addresses/my')
      .then((data) => this.addresses.set(data))
      .catch(() => this.addresses.set([]));
  }

  startAdd(): void {
    this.form.set(emptyForm);
    this.editingId.set(null);
    this.showForm.set(true);
    this.error.set('');
  }

  startEdit(a: Address): void {
    this.form.set({
      label: a.label,
      houseNumber: a.house_number ?? '',
      street: a.street ?? '',
      village: a.village ?? '',
      city: a.city ?? '',
      province: a.province ?? '',
      postalCode: a.postal_code ?? '',
    });
    this.editingId.set(a.id);
    this.showForm.set(true);
    this.error.set('');
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.set(emptyForm);
    this.error.set('');
  }

  async handleSubmit(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const id = this.editingId();
      if (id) await this.api.put(`/addresses/${id}`, this.form());
      else await this.api.post('/addresses', this.form());
      this.load();
      this.cancel();
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    if (!confirm('Delete this address?')) return;
    await this.api.delete(`/addresses/${id}`);
    this.load();
  }

  async setDefault(id: string): Promise<void> {
    await this.api.put(`/addresses/${id}/default`);
    this.load();
  }

  joinParts(...parts: (string | undefined)[]): string {
    return parts.filter(Boolean).join(' ');
  }

  joinPartsComma(...parts: (string | undefined)[]): string {
    return parts.filter(Boolean).join(', ');
  }
}

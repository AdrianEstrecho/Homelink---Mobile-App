import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus } from '@lucide/angular';

import { ApiService } from '../../core/api.service';
import { Address, NewAddressForm, PROFILE_ADDRESS_ID } from '../../core/address.model';
import { AuthService } from '../../core/auth.service';

const emptyAddressForm: NewAddressForm = { label: '', houseNumber: '', street: '', village: '', city: '', province: '', postalCode: '' };

/**
 * Ported from frontend/src/components/AddressPicker.jsx. React exposes
 * `validate()` via forwardRef+useImperativeHandle; here it's just a public
 * method, called from the parent via viewChild() (see Checkout/ServiceBook).
 */
@Component({
  selector: 'app-address-picker',
  imports: [FormsModule, LucidePlus],
  templateUrl: './address-picker.html',
  styleUrl: './address-picker.css',
})
export class AddressPicker {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  readonly stepNumber = input(1);
  readonly title = input('Address');

  protected readonly addresses = signal<Address[] | null>(null);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly form = signal<NewAddressForm>(emptyAddressForm);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly hasProfileAddress = computed(() => !!this.auth.user()?.address?.trim());

  protected readonly options = computed<Address[]>(() => {
    const profile = this.hasProfileAddress()
      ? [{ id: PROFILE_ADDRESS_ID, label: 'My Profile Address', fullAddress: this.auth.user()!.address!.trim(), is_default: false }]
      : [];
    return [...(this.addresses() ?? []), ...profile];
  });

  constructor() {
    this.api
      .get<Address[]>('/addresses/my')
      .then((data) => {
        this.addresses.set(data);
        const def = data.find((a) => a.is_default) ?? data[0];
        if (def) this.selectedId.set(def.id);
        else if (this.hasProfileAddress()) this.selectedId.set(PROFILE_ADDRESS_ID);
        else this.showForm.set(true);
      })
      .catch(() => {
        this.addresses.set([]);
        if (this.hasProfileAddress()) this.selectedId.set(PROFILE_ADDRESS_ID);
        else this.showForm.set(true);
      });
  }

  updateField<K extends keyof NewAddressForm>(key: K, value: NewAddressForm[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  openForm(): void {
    this.showForm.set(true);
    this.error.set('');
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.error.set('');
  }

  async handleSave(): Promise<void> {
    this.saving.set(true);
    this.error.set('');
    try {
      const saved = await this.api.post<Address>('/addresses', this.form());
      this.addresses.update((prev) => [saved, ...(prev ?? [])]);
      this.selectedId.set(saved.id);
      this.showForm.set(false);
      this.form.set(emptyAddressForm);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  validate(): Address | null {
    return this.options().find((a) => a.id === this.selectedId()) ?? null;
  }
}
